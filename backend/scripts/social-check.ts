/**
 * Exercises the social features end to end against a real PostgreSQL: posts and
 * their likes, comments, discussions, the feed, friend requests and friendships.
 * Same shape as users-check and events-check: boot the exported app on an
 * ephemeral port and assert on HTTP responses. Cross-user authorization lives in
 * authz-check.
 *
 * Needs a migrated PostgreSQL (DATABASE_URL) and, until the last domain moves, a
 * MongoDB (MONGO_URI) for notifications and reports. Run with: npm run check:social
 * Fixtures are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import 'dotenv/config';
import mongoose from 'mongoose';
import { eq, like } from 'drizzle-orm';
import app from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import { discussions, events, posts, users } from '../db/schema.ts';
import { hashPassword } from '../utils/password.util.ts';
import { createAccessToken } from '../utils/jwt.util.ts';
import { UserRole } from '../types/user.ts';

// Notifications and reports are still on MongoDB until ticket 10.
await mongoose.connect(process.env.MONGO_URI as string);

const stamp = Date.now();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

// Own caller per request so the rate limiter, which keys on CF-Connecting-IP, never interferes.
let caller = 0;
const call = async (method: string, path: string, body?: unknown, token?: string) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': `10.2.${caller >> 8}.${caller++ & 255}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

const out: string[] = [];
const check = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    out.push(`  PASS  ${name}`);
  } catch (e) {
    out.push(`  FAIL  ${name}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
};

const PASSWORD = 'Passw0rdLong1';
const mkUser = async (n: string, role: 'volunteer' | 'manager' | 'admin') => {
  const [row] = await db.insert(users).values({
    username: `zz_${n}_${stamp}`, email: `zz_${n}_${stamp}@test.local`, passwordHash: await hashPassword(PASSWORD),
    name: n, birthdate: new Date('1990-01-01'), role, isVerified: true,
  }).returning();
  return { id: row!.id, token: createAccessToken({ id: row!.id, email: row!.email, role: role as UserRole }) };
};

const admin = await mkUser('admin', 'admin');
const mgr = await mkUser('mgr', 'manager');
const vol = await mkUser('vol', 'volunteer');
const vol2 = await mkUser('vol2', 'volunteer');
const vol3 = await mkUser('vol3', 'volunteer');
const vol4 = await mkUser('vol4', 'volunteer');

const DAY = 864e5;
const inDays = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const NO_SUCH_ID = '00000000-0000-4000-8000-000000000000';

/** Creates through the API as a manager, then has the admin approve it. */
const mkApprovedEvent = async (n: string) => {
  const created = await call('POST', '/api/events', {
    title: `zz_${n}_${stamp}`, startAt: inDays(3), endAt: inDays(4), location: 'Hanoi',
  }, mgr.token);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id: string = created.data.data._id;
  const approved = await call('PATCH', `/api/events/${id}/approve`, undefined, admin.token);
  assert.equal(approved.status, 200, JSON.stringify(approved.data));
  return id;
};

const mkPost = async (eventId: string, token: string, content = 'hello') => {
  const res = await call('POST', '/api/posts', { eventId, content }, token);
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return res.data.data._id as string;
};

const evId = await mkApprovedEvent('posts');

// --- posts ----------------------------------------------------------------

let postId = '';
await check('a post is created, read by id with its author, and listed under its event', async () => {
  const res = await call('POST', '/api/posts', { eventId: evId, content: 'First post' }, vol.token);
  assert.equal(res.status, 201, JSON.stringify(res.data));
  const p = res.data.data;
  postId = p._id;
  assert.ok(postId);
  assert.equal(p.eventId, evId);
  assert.equal(p.authorId, vol.id, 'author is the caller, unpopulated');
  assert.equal(p.content, 'First post');
  assert.deepEqual(p.likes, []);
  assert.equal(p.pinned, false);
  assert.ok(p.createdAt && p.updatedAt);

  assert.equal((await call('POST', '/api/posts', { eventId: evId, content: 'x' })).status, 401, 'anonymous');
  assert.equal((await call('POST', '/api/posts', { eventId: evId }, vol.token)).status, 400, 'no text and no image');
  assert.equal((await call('POST', '/api/posts', { eventId: NO_SUCH_ID, content: 'x' }, vol.token)).status, 404, 'unknown event');

  const one = await call('GET', `/api/posts/${postId}`, undefined, vol.token);
  assert.equal(one.status, 200, JSON.stringify(one.data));
  assert.equal(one.data.data._id, postId);
  assert.equal(one.data.data.authorId._id, vol.id, 'author is populated');
  assert.equal(one.data.data.authorId.username, `zz_vol_${stamp}`);
  assert.equal(one.data.data.authorId.name, 'vol');
  assert.deepEqual(one.data.data.likes, []);
  assert.equal((await call('GET', `/api/posts/${NO_SUCH_ID}`, undefined, vol.token)).status, 404);
  assert.equal((await call('GET', '/api/posts/not-an-id', undefined, vol.token)).status, 404);

  const list = await call('GET', `/api/events/${evId}/posts`);
  assert.equal(list.status, 200, JSON.stringify(list.data));
  assert.deepEqual(list.data.data.map((x: any) => x._id), [postId]);
  assert.equal(list.data.data[0].authorId._id, vol.id);
  assert.equal(list.data.data[0].authorId.role, 'volunteer', 'the event listing also carries role and email');
  assert.equal(list.data.data[0].authorId.email, `zz_vol_${stamp}@test.local`);
  assert.deepEqual((await call('GET', `/api/events/${NO_SUCH_ID}/posts`)).data.data, []);
});

await check('liking toggles and lists likers by name, in the order they liked', async () => {
  const liked = await call('POST', `/api/posts/${postId}/like`, undefined, vol2.token);
  assert.equal(liked.status, 200, JSON.stringify(liked.data));
  assert.deepEqual(liked.data.data.likes, [vol2.id], 'the like response carries ids');

  const one = await call('GET', `/api/posts/${postId}`, undefined, vol.token);
  assert.deepEqual(one.data.data.likes.map((l: any) => [l._id, l.name, l.username]), [[vol2.id, 'vol2', `zz_vol2_${stamp}`]]);

  const own = await call('POST', `/api/posts/${postId}/like`, undefined, vol.token);
  assert.deepEqual(own.data.data.likes, [vol2.id, vol.id], 'likes keep the order they were made in');

  const unliked = await call('POST', `/api/posts/${postId}/like`, undefined, vol2.token);
  assert.deepEqual(unliked.data.data.likes, [vol.id]);

  assert.equal((await call('POST', `/api/posts/${NO_SUCH_ID}/like`, undefined, vol.token)).status, 404);
});

await check('pinned posts come first, newest next, and only managers and admins may pin', async () => {
  const second = await mkPost(evId, vol2.token, 'Second post');
  const third = await mkPost(evId, vol.token, 'Third post');
  assert.deepEqual((await call('GET', `/api/events/${evId}/posts`)).data.data.map((x: any) => x._id), [third, second, postId], 'newest first');

  assert.equal((await call('POST', `/api/posts/${postId}/pin`, undefined, vol.token)).status, 403, 'the author cannot pin');
  const pinned = await call('POST', `/api/posts/${postId}/pin`, undefined, mgr.token);
  assert.equal(pinned.status, 200, JSON.stringify(pinned.data));
  assert.equal(pinned.data.data.pinned, true);
  assert.deepEqual((await call('GET', `/api/events/${evId}/posts`)).data.data.map((x: any) => x._id), [postId, third, second], 'pinned first');

  const unpinned = await call('POST', `/api/posts/${postId}/pin`, undefined, mgr.token);
  assert.equal(unpinned.data.data.pinned, false, 'pinning again toggles');
  assert.equal((await call('POST', `/api/posts/${NO_SUCH_ID}/pin`, undefined, mgr.token)).status, 404);

  // The event's own pin keeps one pinned post per event.
  const pin2 = await call('POST', `/api/events/${evId}/pin`, { postId: second }, mgr.token);
  assert.equal(pin2.status, 200, JSON.stringify(pin2.data));
  assert.equal(pin2.data.data._id, second);
  assert.equal(pin2.data.data.pinned, true);
  const pin3 = await call('POST', `/api/events/${evId}/pin`, { postId: third }, mgr.token);
  assert.equal(pin3.status, 200, JSON.stringify(pin3.data));
  assert.deepEqual((await call('GET', `/api/events/${evId}/posts`)).data.data.map((x: any) => [x._id, x.pinned]),
    [[third, true], [second, false], [postId, false]], 'pinning one unpins the other');

  const otherEvent = await mkApprovedEvent('posts_other');
  const foreign = await mkPost(otherEvent, vol.token);
  assert.equal((await call('POST', `/api/events/${evId}/pin`, { postId: foreign }, mgr.token)).status, 400, 'post of another event');
  assert.equal((await call('POST', `/api/events/${evId}/pin`, { postId: NO_SUCH_ID }, mgr.token)).status, 404);
});

await check('deleting a post is for its author, managers and admins; the event stats count posts', async () => {
  const mine = await mkPost(evId, vol.token, 'to delete');
  assert.equal((await call('DELETE', `/api/posts/${mine}`, undefined, vol2.token)).status, 403, 'another volunteer');
  const del = await call('DELETE', `/api/posts/${mine}`, undefined, vol.token);
  assert.equal(del.status, 200, JSON.stringify(del.data));
  assert.equal(del.data.data._id, mine, 'the deleted post is returned');
  assert.equal((await call('GET', `/api/posts/${mine}`, undefined, vol.token)).status, 404);
  assert.equal((await call('DELETE', `/api/posts/${mine}`, undefined, vol.token)).status, 404, 'already gone');

  const byManager = await mkPost(evId, vol.token, 'moderated');
  assert.equal((await call('DELETE', `/api/posts/${byManager}`, undefined, mgr.token)).status, 200);
  const byAdmin = await mkPost(evId, vol.token, 'moderated by admin');
  assert.equal((await call('DELETE', `/api/posts/${byAdmin}`, undefined, admin.token)).status, 200);

  const stats = await call('GET', `/api/events/${evId}/stats`, undefined, mgr.token);
  assert.equal(stats.status, 200, JSON.stringify(stats.data));
  assert.equal(stats.data.data.postsCount, 3);
});

await check('deleting an event removes its posts, and deleting an author removes theirs', async () => {
  const id = await mkApprovedEvent('posts_gone');
  const kept = await mkPost(id, vol.token);
  assert.equal((await call('DELETE', `/api/events/${id}`, undefined, mgr.token)).status, 200);
  assert.equal((await db.select().from(posts).where(eq(posts.id, kept))).length, 0, 'post went with the event');

  const doomed = await mkUser('doomed', 'volunteer');
  const orphan = await mkPost(evId, doomed.token);
  assert.equal((await call('DELETE', `/api/users/admin/${doomed.id}`, undefined, admin.token)).status, 200);
  assert.equal((await db.select().from(posts).where(eq(posts.id, orphan))).length, 0, 'no orphaned post');
});

// --- comments -------------------------------------------------------------

await check('comments are created, listed newest first with their author, and need a post', async () => {
  const id = await mkApprovedEvent('comments');
  const post = await mkPost(id, vol.token, 'Discuss');

  const first = await call('POST', `/api/comments/post/${post}`, { content: 'first!' }, vol2.token);
  assert.equal(first.status, 201, JSON.stringify(first.data));
  const c = first.data.data;
  assert.ok(c._id);
  assert.equal(c.postId, post);
  assert.equal(c.authorId, vol2.id, 'author is the caller, unpopulated');
  assert.equal(c.content, 'first!');
  assert.deepEqual(c.likes, []);
  assert.ok(c.createdAt && c.updatedAt);
  const second = await call('POST', `/api/comments/post/${post}`, { content: 'second' }, vol.token);
  assert.equal(second.status, 201, JSON.stringify(second.data));

  assert.equal((await call('POST', `/api/comments/post/${post}`, { content: 'x' })).status, 401, 'anonymous');
  assert.equal((await call('POST', `/api/comments/post/${post}`, {}, vol.token)).status, 400, 'no content');
  assert.equal((await call('POST', `/api/comments/post/${NO_SUCH_ID}`, { content: 'x' }, vol.token)).status, 404, 'unknown post');

  const list = await call('GET', `/api/comments/post/${post}`);
  assert.equal(list.status, 200, JSON.stringify(list.data));
  assert.deepEqual(list.data.data.map((x: any) => x.content), ['second', 'first!'], 'newest first');
  assert.equal(list.data.data[1].authorId._id, vol2.id, 'author is populated');
  assert.equal(list.data.data[1].authorId.name, 'vol2');
  assert.equal(list.data.data[1].authorId.username, `zz_vol2_${stamp}`);
  assert.deepEqual((await call('GET', `/api/comments/post/${NO_SUCH_ID}`)).data.data, []);
  assert.deepEqual((await call('GET', '/api/comments/post/not-an-id')).data.data, []);
});

await check('liking a comment toggles, and deleting is for its author, managers and admins', async () => {
  const post = await mkPost(evId, vol.token, 'More talk');
  const made = await call('POST', `/api/comments/post/${post}`, { content: 'like me' }, vol.token);
  const commentId: string = made.data.data._id;

  const liked = await call('POST', `/api/comments/like/${commentId}`, undefined, vol2.token);
  assert.equal(liked.status, 200, JSON.stringify(liked.data));
  assert.deepEqual(liked.data.data.likes, [vol2.id]);
  const both = await call('POST', `/api/comments/like/${commentId}`, undefined, vol.token);
  assert.deepEqual(both.data.data.likes, [vol2.id, vol.id], 'likes keep the order they were made in');
  const unliked = await call('POST', `/api/comments/like/${commentId}`, undefined, vol2.token);
  assert.deepEqual(unliked.data.data.likes, [vol.id]);
  assert.deepEqual((await call('GET', `/api/comments/post/${post}`)).data.data[0].likes, [vol.id]);
  assert.equal((await call('POST', `/api/comments/like/${NO_SUCH_ID}`, undefined, vol.token)).status, 404);

  assert.equal((await call('DELETE', `/api/comments/${commentId}`, undefined, vol2.token)).status, 403, 'another volunteer');
  const del = await call('DELETE', `/api/comments/${commentId}`, undefined, vol.token);
  assert.equal(del.status, 200, JSON.stringify(del.data));
  assert.equal(del.data.data._id, commentId, 'the deleted comment is returned');
  assert.equal((await call('DELETE', `/api/comments/${commentId}`, undefined, vol.token)).status, 404, 'already gone');

  const byManager = (await call('POST', `/api/comments/post/${post}`, { content: 'm' }, vol.token)).data.data._id;
  assert.equal((await call('DELETE', `/api/comments/${byManager}`, undefined, mgr.token)).status, 200);
  const byAdmin = (await call('POST', `/api/comments/post/${post}`, { content: 'a' }, vol.token)).data.data._id;
  assert.equal((await call('DELETE', `/api/comments/${byAdmin}`, undefined, admin.token)).status, 200);

  // A post takes its comments with it.
  await call('POST', `/api/comments/post/${post}`, { content: 'orphan?' }, vol.token);
  assert.equal((await call('DELETE', `/api/posts/${post}`, undefined, vol.token)).status, 200);
  assert.deepEqual((await call('GET', `/api/comments/post/${post}`)).data.data, []);
});

// --- discussions ----------------------------------------------------------

await check('approving an event opens its discussion once; posts can join it; deleting the event removes both', async () => {
  const id = await mkApprovedEvent('discussion');
  const found = await db.select().from(discussions).where(eq(discussions.eventId, id));
  assert.equal(found.length, 1, 'approval opened a discussion');
  assert.equal(found[0]!.locked, false);
  const discussionId = found[0]!.id;

  assert.equal((await call('PATCH', `/api/events/${id}/approve`, undefined, admin.token)).status, 200, 'approving again is fine');
  assert.equal((await db.select().from(discussions).where(eq(discussions.eventId, id))).length, 1, 'still one discussion');

  const res = await call('POST', '/api/posts', { discussionId, content: 'In the group' }, vol.token);
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(res.data.data.discussionId, discussionId);
  const joined = res.data.data._id;
  assert.equal((await call('POST', '/api/posts', { discussionId: NO_SUCH_ID, content: 'x' }, vol.token)).status, 404, 'unknown discussion');

  assert.equal((await call('DELETE', `/api/events/${id}`, undefined, mgr.token)).status, 200);
  assert.equal((await db.select().from(discussions).where(eq(discussions.eventId, id))).length, 0, 'discussion went with the event');
  assert.equal((await db.select().from(posts).where(eq(posts.id, joined))).length, 0, 'and so did its posts');
});

// --- friends --------------------------------------------------------------

const friendsOf = async (token: string) => (await call('GET', '/api/users/friends', undefined, token)).data.data;
const relations = async (token: string, ids: string[]) =>
  (await call('POST', '/api/users/friends/status', { ids }, token)).data.data;

await check('a friend request is sent, seen by both sides, accepted, and the two become friends', async () => {
  const sent = await call('POST', '/api/users/friends/request', { receiverId: vol2.id }, vol.token);
  assert.equal(sent.status, 201, JSON.stringify(sent.data));
  const r = sent.data.data;
  assert.ok(r._id);
  assert.equal(r.sender, vol.id);
  assert.equal(r.receiver, vol2.id);
  assert.equal(r.status, 'pending');
  assert.ok(r.createdAt);

  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: vol2.id })).status, 401, 'anonymous');
  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: vol.id }, vol.token)).status, 400, 'yourself');
  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: vol2.id }, vol.token)).status, 400, 'twice');
  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: NO_SUCH_ID }, vol.token)).status, 404, 'unknown user');

  const incoming = await call('GET', '/api/users/friends/requests', undefined, vol2.token);
  assert.equal(incoming.status, 200, JSON.stringify(incoming.data));
  assert.equal(incoming.data.data.length, 1);
  assert.equal(incoming.data.data[0]._id, r._id);
  assert.equal(incoming.data.data[0].sender._id, vol.id, 'sender is populated');
  assert.equal(incoming.data.data[0].sender.username, `zz_vol_${stamp}`);
  assert.equal(incoming.data.data[0].sender.name, 'vol');
  assert.equal(incoming.data.data[0].status, 'pending');
  const outgoing = await call('GET', '/api/users/friends/sent', undefined, vol.token);
  assert.equal(outgoing.data.data[0]._id, r._id);
  assert.equal(outgoing.data.data[0].receiver._id, vol2.id, 'receiver is populated');
  assert.deepEqual((await call('GET', '/api/users/friends/requests', undefined, vol.token)).data.data, [], 'the sender has nothing incoming');

  assert.deepEqual(await relations(vol.token, [vol2.id, vol3.id]), { [vol2.id]: 'pending_sent', [vol3.id]: 'none' });
  assert.deepEqual(await relations(vol2.token, [vol.id]), { [vol.id]: 'pending_received' });
  assert.equal((await call('POST', '/api/users/friends/status', { ids: [] }, vol.token)).status, 400);

  assert.equal((await call('POST', '/api/users/friends/accept', { requestId: r._id }, vol.token)).status, 404, 'the sender cannot accept');
  const accepted = await call('POST', '/api/users/friends/accept', { requestId: r._id }, vol2.token);
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal((await call('POST', '/api/users/friends/accept', { requestId: r._id }, vol2.token)).status, 400, 'no longer pending');
  assert.equal((await call('POST', '/api/users/friends/accept', { requestId: NO_SUCH_ID }, vol2.token)).status, 404);
  assert.deepEqual((await call('GET', '/api/users/friends/requests', undefined, vol2.token)).data.data, []);
  assert.deepEqual((await call('GET', '/api/users/friends/sent', undefined, vol.token)).data.data, []);

  const mine = await friendsOf(vol.token);
  assert.deepEqual(mine.map((f: any) => [f._id, f.username, f.name]), [[vol2.id, `zz_vol2_${stamp}`, 'vol2']]);
  assert.deepEqual((await friendsOf(vol2.token)).map((f: any) => f._id), [vol.id], 'friendship goes both ways');
  assert.deepEqual(await relations(vol.token, [vol2.id]), { [vol2.id]: 'friends' });
  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: vol2.id }, vol.token)).status, 400, 'already friends');
});

await check('unfriending works once, and a request can be sent again afterwards', async () => {
  assert.equal((await call('POST', '/api/users/friends/remove', { friendId: vol2.id }, vol.token)).status, 200);
  assert.deepEqual(await friendsOf(vol.token), []);
  assert.deepEqual(await friendsOf(vol2.token), []);
  assert.equal((await call('POST', '/api/users/friends/remove', { friendId: vol2.id }, vol.token)).status, 400, 'not friends any more');
  assert.equal((await call('POST', '/api/users/friends/remove', { friendId: vol.id }, vol.token)).status, 400, 'yourself');

  const again = await call('POST', '/api/users/friends/request', { receiverId: vol2.id }, vol.token);
  assert.equal(again.status, 201, 'the accepted request is replaced, not a conflict');
  assert.equal(again.data.data.status, 'pending');
  assert.equal((await call('POST', '/api/users/friends/accept', { requestId: again.data.data._id }, vol2.token)).status, 200);
  assert.deepEqual((await friendsOf(vol.token)).map((f: any) => f._id), [vol2.id]);
});

await check('a request is rejected by its receiver or cancelled by its sender, and nobody else may', async () => {
  const toRejecting = (await call('POST', '/api/users/friends/request', { receiverId: vol3.id }, vol.token)).data.data._id;
  assert.equal((await call('POST', '/api/users/friends/reject', { requestId: toRejecting }, vol.token)).status, 403, 'the sender cannot reject');
  assert.equal((await call('POST', '/api/users/friends/cancel', { requestId: toRejecting }, vol3.token)).status, 403, 'the receiver cannot cancel');
  assert.equal((await call('POST', '/api/users/friends/cancel', { requestId: toRejecting }, vol2.token)).status, 403, 'a stranger cannot cancel');
  assert.equal((await call('POST', '/api/users/friends/reject', { requestId: toRejecting }, vol3.token)).status, 200);
  assert.equal((await call('POST', '/api/users/friends/reject', { requestId: toRejecting }, vol3.token)).status, 404, 'already gone');
  assert.deepEqual(await relations(vol.token, [vol3.id]), { [vol3.id]: 'none' });

  const toCancelling = (await call('POST', '/api/users/friends/request', { receiverId: vol3.id }, vol.token)).data.data._id;
  assert.equal((await call('POST', '/api/users/friends/cancel', { requestId: toCancelling }, vol.token)).status, 200);
  assert.deepEqual((await call('GET', '/api/users/friends/requests', undefined, vol3.token)).data.data, []);
  assert.equal((await call('POST', '/api/users/friends/cancel', { requestId: NO_SUCH_ID }, vol.token)).status, 404);
});

await check('adding a friend directly is symmetric and refuses doubles', async () => {
  assert.equal((await call('POST', '/api/users/friends/add', { friendId: vol3.id }, vol2.token)).status, 200);
  assert.equal((await call('POST', '/api/users/friends/add', { friendId: vol3.id }, vol2.token)).status, 400, 'already friends');
  assert.equal((await call('POST', '/api/users/friends/add', { friendId: vol2.id }, vol3.token)).status, 400, 'from the other side too');
  assert.equal((await call('POST', '/api/users/friends/add', { friendId: vol2.id }, vol2.token)).status, 400, 'yourself');
  assert.equal((await call('POST', '/api/users/friends/add', { friendId: NO_SUCH_ID }, vol2.token)).status, 404, 'unknown user');
  assert.deepEqual((await friendsOf(vol3.token)).map((f: any) => f._id), [vol2.id]);
  assert.deepEqual((await friendsOf(vol2.token)).map((f: any) => f._id).sort(), [vol.id, vol3.id].sort());
});

await check('suggestions rank by mutual friends; profiles show a friend count and list; deleting a user drops their friendships', async () => {
  // vol - vol2 - vol3: vol3 is a friend of a friend of vol, vol4 is nobody's.
  const suggested = (await call('GET', '/api/users/friends/suggestions', undefined, vol.token)).data.data;
  const ids = suggested.map((u: any) => u._id);
  assert.ok(!ids.includes(vol.id), 'not yourself');
  assert.ok(!ids.includes(vol2.id), 'not a current friend');
  assert.ok(!ids.includes(admin.id), 'not an admin');
  const three = suggested.find((u: any) => u._id === vol3.id);
  assert.ok(three, 'friend of a friend is suggested');
  assert.equal(three.mutualFriends, 1);
  assert.equal(three.username, `zz_vol3_${stamp}`);
  assert.equal(three.name, 'vol3');
  assert.equal(ids.indexOf(vol3.id), 0, 'the only candidate with a mutual friend comes first');

  const stats = await call('GET', `/api/users/zz_vol2_${stamp}/stats`);
  assert.equal(stats.status, 200, JSON.stringify(stats.data));
  assert.equal(stats.data.data.stats.friends, 2);
  const list = await call('GET', `/api/users/zz_vol2_${stamp}/friends`);
  assert.equal(list.status, 200, JSON.stringify(list.data));
  assert.deepEqual(list.data.data.map((f: any) => [f._id, f.role]).sort(), [[vol.id, 'volunteer'], [vol3.id, 'volunteer']].sort());
  assert.equal((await call('GET', `/api/users/zz_admin_${stamp}/friends`)).status, 403, 'admin profiles stay private');

  const doomed = await mkUser('doomedfriend', 'volunteer');
  assert.equal((await call('POST', '/api/users/friends/add', { friendId: doomed.id }, vol4.token)).status, 200);
  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: doomed.id }, vol3.token)).status, 201);
  assert.equal((await call('DELETE', `/api/users/admin/${doomed.id}`, undefined, admin.token)).status, 200);
  assert.deepEqual(await friendsOf(vol4.token), [], 'friendship went with the user');
  assert.deepEqual((await call('GET', '/api/users/friends/sent', undefined, vol3.token)).data.data, [], 'and so did the request');
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'SOCIAL CHECK FAILED' : 'SOCIAL CHECK PASSED');

// Posts, comments and friendships go with their events and users.
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
await mongoose.disconnect();
await closeDb();
process.exit();
