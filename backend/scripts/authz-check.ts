/**
 * Proves the authorization fixes hold end to end against a real database.
 *
 * Two families of case:
 *   - vertical:   a volunteer must not reach the admin routes, and a ban must
 *                 take effect on a token issued before the ban.
 *   - horizontal: a manager must not act on another manager's event. Passing
 *                 roleMiddleware only proves the caller is *a* manager.
 *
 * Needs a migrated PostgreSQL (DATABASE_URL). Run with: npm run check:authz
 * Test accounts and events are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import app from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import { comments, discussions, events, posts, registrations, reports, users } from '../db/schema.ts';
import { UPLOADS_DIR } from '../services/image.service.ts';
import { UserRole } from '../types/user.ts';
import { createAccessToken } from '../utils/jwt.util.ts';
import { comparePassword, hashPassword } from '../utils/password.util.ts';


const stamp = Date.now();
const mkUser = async (n: string, role: UserRole, password = 'Passw0rdLong1') => {
  const [row] = await db.insert(users).values({
    username: `zz_${n}_${stamp}`,
    email: `zz_${n}_${stamp}@test.local`,
    passwordHash: await hashPassword(password),
    name: n,
    birthdate: new Date('1990-01-01'),
    role,
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  }).returning();
  return row!;
};
const userRow = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];
const eventRow = async (id: string) => (await db.select().from(events).where(eq(events.id, id)))[0];
const regRow = async (id: string) => (await db.select().from(registrations).where(eq(registrations.id, id)))[0];

const victimAdmin = await mkUser('admin', UserRole.Admin, 'OriginalAdminPw1');
const attacker = await mkUser('vol', UserRole.Volunteer);
const victimMgr = await mkUser('victimmgr', UserRole.Manager);
const evilMgr = await mkUser('evilmgr', UserRole.Manager);

const [victimEvent] = await db.insert(events).values({
  title: 'Victim Event',
  description: 'd',
  location: 'l',
  startAt: new Date(Date.now() + 864e5),
  endAt: new Date(Date.now() + 9e7),
  managerId: victimMgr.id,
  status: 'pending',
  isPublic: true,
}).returning();
const [victimReg] = await db.insert(registrations).values({
  eventId: victimEvent!.id,
  volunteerId: attacker.id,
  status: 'pending',
}).returning();

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

const auth = (u: typeof attacker) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${createAccessToken({ id: u.id, email: u.email, role: u.role as UserRole })}`,
});
const H = auth(attacker);
const EH = auth(evilMgr);

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

// --- vertical: volunteer against the admin routes ------------------------

await check('volunteer cannot promote itself to admin', async () => {
  const res = await fetch(`${base}/api/users/admin/${attacker.id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ role: 'admin' }),
  });
  assert.equal(res.status, 403);
  const after = await userRow(attacker.id);
  assert.ok(after);
  assert.equal(after.role, UserRole.Volunteer, 'role changed in the database');
});

await check("volunteer cannot reset an admin's password", async () => {
  const res = await fetch(`${base}/api/users/admin/${victimAdmin.id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ password: 'HackedPassword1' }),
  });
  assert.equal(res.status, 403);
  const after = await userRow(victimAdmin.id);
  assert.ok(after);
  assert.equal(await comparePassword('HackedPassword1', after.passwordHash), false, 'password was changed');
  assert.equal(await comparePassword('OriginalAdminPw1', after.passwordHash), true, 'original password broken');
});

await check('volunteer cannot delete another account', async () => {
  const res = await fetch(`${base}/api/users/admin/${victimAdmin.id}`, { method: 'DELETE', headers: H });
  assert.equal(res.status, 403);
  assert.ok(await userRow(victimAdmin.id), 'admin was deleted');
});

await check('volunteer cannot mint a new admin', async () => {
  const res = await fetch(`${base}/api/users/admin/create`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      username: `zz_new_${stamp}`, email: `zz_new_${stamp}@test.local`,
      password: 'NewAdminPw1234', name: 'New', role: 'admin',
    }),
  });
  assert.equal(res.status, 403);
  assert.equal((await db.select().from(users).where(eq(users.username, `zz_new_${stamp}`))).length, 0, 'account was created');
});

// --- horizontal: manager against another manager's event -----------------

await check("manager cannot edit another manager's event", async () => {
  const res = await fetch(`${base}/api/events/${victimEvent!.id}`, {
    method: 'PUT', headers: EH, body: JSON.stringify({ title: 'HIJACKED' }),
  });
  assert.equal(res.status, 403);
  const after = await eventRow(victimEvent!.id);
  assert.ok(after);
  assert.equal(after.title, 'Victim Event', 'title was changed');
});

await check('manager cannot approve an event via PUT', async () => {
  const res = await fetch(`${base}/api/events/${victimEvent!.id}`, {
    method: 'PUT', headers: EH, body: JSON.stringify({ status: 'approved' }),
  });
  assert.ok(res.status >= 400, `expected a rejection, got ${res.status}`);
  const after = await eventRow(victimEvent!.id);
  assert.ok(after);
  assert.equal(after.status, 'pending', 'event was approved without an admin');
});

await check("manager cannot moderate registrations on another's event", async () => {
  const res = await fetch(`${base}/api/register/${victimReg!.id}/approve`, { method: 'POST', headers: EH });
  assert.equal(res.status, 403);
  const after = await regRow(victimReg!.id);
  assert.ok(after);
  assert.equal(after.status, 'pending', 'registration was approved');
});

await check("manager cannot reject or kick on another's event", async () => {
  for (const action of ['reject', 'kick']) {
    const res = await fetch(`${base}/api/register/${victimReg!.id}/${action}`, { method: 'POST', headers: EH });
    assert.equal(res.status, 403, action);
  }
  assert.equal((await regRow(victimReg!.id))?.status, 'pending');
});

await check("manager cannot complete, delete or read stats of another manager's event", async () => {
  const complete = await fetch(`${base}/api/events/${victimEvent!.id}/complete`, { method: 'PATCH', headers: EH });
  assert.equal(complete.status, 403, 'complete');
  const stats = await fetch(`${base}/api/events/${victimEvent!.id}/stats`, { headers: EH });
  assert.equal(stats.status, 403, 'stats');
  const del = await fetch(`${base}/api/events/${victimEvent!.id}`, { method: 'DELETE', headers: EH });
  assert.equal(del.status, 403, 'delete');
  const after = await eventRow(victimEvent!.id);
  assert.ok(after, 'event was deleted');
  assert.equal(after.status, 'pending', 'event was completed');
});

await check('member list does not leak emails to non-organisers', async () => {
  // The roster must actually contain an approved member, otherwise an empty
  // list would pass this check without proving anything.
  await db.update(registrations).set({ status: 'approved' }).where(eq(registrations.id, victimReg!.id));
  const res = await fetch(`${base}/api/register/${victimEvent!.id}`, { headers: H });
  const body = await res.text();
  assert.ok(body.includes(`zz_vol_${stamp}`), 'the approved member should still be listed');
  assert.ok(!body.includes('@test.local'), 'an email address was exposed');
  await db.update(registrations).set({ status: 'pending' }).where(eq(registrations.id, victimReg!.id));
});

await check("another manager's event listing hides another manager's pending events", async () => {
  const res = await fetch(`${base}/api/events?status=pending&q=Victim%20Event`, { headers: EH });
  assert.equal(res.status, 200);
  const body = await res.json() as { items: { _id: string }[] };
  assert.ok(!body.items.some((e) => e._id === victimEvent!.id), "another manager's pending event was listed");
});

await check('pending events cannot be listed through a status list either', async () => {
  const anon = await fetch(`${base}/api/events?status=approved,pending&q=Victim%20Event`);
  assert.equal(anon.status, 403, 'anonymous caller');
  const evil = await fetch(`${base}/api/events?status=approved,pending&q=Victim%20Event`, { headers: EH });
  assert.equal(evil.status, 200);
  const body = await evil.json() as { items: { _id: string }[] };
  assert.ok(!body.items.some((e) => e._id === victimEvent!.id), "another manager's pending event was listed");
});

// --- an event's content is moderated by its moderators only --------------

const mkPost = async (at: { eventId?: string; discussionId?: string }) =>
  (await db.insert(posts).values({ ...at, authorId: attacker.id, content: 'c' }).returning())[0]!.id;
const postExists = async (id: string) => (await db.select().from(posts).where(eq(posts.id, id))).length === 1;
const del = (path: string, u: typeof attacker) => fetch(`${base}${path}`, { method: 'DELETE', headers: auth(u) });

await check("a post is deleted by its event's manager, not by a manager of another event", async () => {
  const id = await mkPost({ eventId: victimEvent!.id });
  assert.equal((await del(`/api/posts/${id}`, evilMgr)).status, 403, 'manager of another event');
  assert.ok(await postExists(id), 'post was deleted');
  assert.equal((await del(`/api/posts/${id}`, victimMgr)).status, 200, 'event manager');
  assert.equal(await postExists(id), false);
});

await check("a comment is deleted by its event's manager, not by a manager of another event", async () => {
  const postId = await mkPost({ eventId: victimEvent!.id });
  const [comment] = await db.insert(comments).values({ postId, authorId: attacker.id, content: 'c' }).returning();
  const exists = async () => (await db.select().from(comments).where(eq(comments.id, comment!.id))).length === 1;
  assert.equal((await del(`/api/comments/${comment!.id}`, evilMgr)).status, 403, 'manager of another event');
  assert.ok(await exists(), 'comment was deleted');
  assert.equal((await del(`/api/comments/${comment!.id}`, victimMgr)).status, 200, 'event manager');
  assert.equal(await exists(), false);
});

await check("a post in an event's discussion is moderated by that event's manager", async () => {
  const [discussion] = await db.insert(discussions).values({ eventId: victimEvent!.id }).returning();
  const id = await mkPost({ discussionId: discussion!.id });
  assert.equal((await del(`/api/posts/${id}`, evilMgr)).status, 403, 'manager of another event');
  assert.ok(await postExists(id), 'post was deleted');
  assert.equal((await del(`/api/posts/${id}`, victimMgr)).status, 200, 'event manager');
  assert.equal(await postExists(id), false);
});

await check('a post in no event is deleted by its author or an admin only', async () => {
  const byAuthor = await mkPost({});
  assert.equal((await del(`/api/posts/${byAuthor}`, victimMgr)).status, 403, 'a manager');
  assert.ok(await postExists(byAuthor), 'post was deleted');
  assert.equal((await del(`/api/posts/${byAuthor}`, attacker)).status, 200, 'author');
  const byAdmin = await mkPost({});
  assert.equal((await del(`/api/posts/${byAdmin}`, victimAdmin)).status, 200, 'admin');
  assert.equal(await postExists(byAdmin), false);
});

await check("a post is pinned by its event's moderators only, and only through its event", async () => {
  const id = await mkPost({ eventId: victimEvent!.id });
  const pin = (u: typeof attacker) => fetch(`${base}/api/events/${victimEvent!.id}/pin`, {
    method: 'POST', headers: auth(u), body: JSON.stringify({ postId: id }),
  });
  const pinned = async () => (await db.select().from(posts).where(eq(posts.id, id)))[0]!.pinned;
  assert.equal((await pin(evilMgr)).status, 403, 'manager of another event');
  assert.equal(await pinned(), false, 'post was pinned');
  const postScoped = await fetch(`${base}/api/posts/${id}/pin`, { method: 'POST', headers: auth(victimAdmin) });
  assert.equal(postScoped.status, 404, 'the post-scoped pin endpoint still exists');
  assert.equal(await pinned(), false, 'post was pinned');
  assert.equal((await pin(victimMgr)).status, 200, 'event manager');
  assert.equal(await pinned(), true);
});

// --- a report about a post goes to the moderators of its event -----------

const reporter = await mkUser('reporter', UserRole.Volunteer);
const fileReport = async (kind: 'post' | 'user' | 'event', body: object) => {
  const res = await fetch(`${base}/api/report/${kind}`, {
    method: 'POST', headers: auth(reporter), body: JSON.stringify({ reason: 'r', ...body }),
  });
  assert.equal(res.status, 201, `filing a ${kind} report`);
  return ((await res.json()) as { _id: string })._id;
};
const setStatus = (id: string, status: string, u: typeof attacker) => fetch(`${base}/api/report/${id}`, {
  method: 'PATCH', headers: auth(u), body: JSON.stringify({ status }),
});
const statusOf = async (id: string) => (await db.select().from(reports).where(eq(reports.id, id)))[0]!.status;
const listed = async (path: string, u: typeof attacker) => {
  const res = await fetch(`${base}${path}`, { headers: auth(u) });
  assert.equal(res.status, 200, path);
  return ((await res.json()) as { _id: string; targetType: string }[]);
};
const imageName = `${randomBytes(16).toString('hex')}.webp`;

await check("a report about a post is resolved by its event's manager, which deletes the post and its image", async () => {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, imageName), 'x');
  const [post] = await db.insert(posts).values({
    eventId: victimEvent!.id, authorId: attacker.id, content: 'c', image: `/uploads/${imageName}`,
  }).returning();
  const id = await fileReport('post', { postId: post!.id });

  for (const status of ['resolved', 'rejected']) {
    assert.equal((await setStatus(id, status, evilMgr)).status, 403, `manager of another event: ${status}`);
  }
  const read = await fetch(`${base}/api/report/event/${victimEvent!.id}/reports`, { headers: EH });
  assert.equal(read.status, 403, "manager of another event reads the event's reports");
  assert.ok(!(await listed('/api/report/admin/all', evilMgr)).some((r) => r._id === id), "in another manager's list");
  assert.equal(await statusOf(id), 'pending');
  assert.ok(await postExists(post!.id), 'post was deleted');

  assert.ok((await listed(`/api/report/event/${victimEvent!.id}/reports`, victimMgr)).some((r) => r._id === id), 'event manager reads it');
  const res = await setStatus(id, 'resolved', victimMgr);
  assert.equal(res.status, 200, 'event manager');
  assert.equal(await statusOf(id), 'resolved');
  assert.equal(await postExists(post!.id), false, 'the post is gone');
  assert.equal(existsSync(path.join(UPLOADS_DIR, imageName)), false, 'the image is gone');
  const told = await (await fetch(`${base}/api/notifications?limit=100`, { headers: auth(reporter) })).json() as
    { data: { notifications: { type: string; data?: { reportId?: string } }[] } };
  assert.ok(told.data.notifications.some((n) => n.type === 'report_resolved' && n.data?.reportId === id), 'the reporter is notified');
});

await check("rejecting a report about a post leaves the post in place", async () => {
  const postId = await mkPost({ eventId: victimEvent!.id });
  const id = await fileReport('post', { postId });
  assert.equal((await setStatus(id, 'rejected', victimMgr)).status, 200, 'event manager');
  assert.equal(await statusOf(id), 'rejected');
  assert.ok(await postExists(postId), 'post was deleted');
});

await check('setting the status of an unknown report answers 404', async () => {
  assert.equal((await setStatus('00000000-0000-4000-8000-000000000000', 'resolved', victimAdmin)).status, 404);
  assert.equal((await setStatus('00000000-0000-4000-8000-000000000000', 'resolved', victimMgr)).status, 404);
});

await check('a manager cannot resolve or reject a report about a user or an event, their own event included', async () => {
  const ids = [
    await fileReport('user', { targetId: attacker.id }),
    await fileReport('event', { eventId: victimEvent!.id }),
  ];
  for (const id of ids) {
    for (const status of ['resolved', 'rejected']) {
      assert.equal((await setStatus(id, status, victimMgr)).status, 403, `event manager: ${status}`);
      assert.equal((await setStatus(id, status, evilMgr)).status, 403, `another manager: ${status}`);
    }
    assert.equal(await statusOf(id), 'pending');
  }
});

await check('a report about a post in no event, or about a post that is gone, is handled by admins only', async () => {
  const orphan = await fileReport('post', { postId: await mkPost({}) });
  const goneId = await mkPost({ eventId: victimEvent!.id });
  const gone = await fileReport('post', { postId: goneId });
  await db.delete(posts).where(eq(posts.id, goneId));
  for (const id of [orphan, gone]) {
    assert.equal((await setStatus(id, 'rejected', victimMgr)).status, 403, 'a manager');
    assert.equal(await statusOf(id), 'pending');
  }
  assert.equal((await setStatus(orphan, 'rejected', victimAdmin)).status, 200, 'admin');
  assert.equal((await setStatus(gone, 'resolved', victimAdmin)).status, 200, 'admin, post already gone');
  assert.equal(await statusOf(gone), 'resolved');
});

await check("a report about a post in an event's discussion goes to that event's manager", async () => {
  const [discussion] = await db.select().from(discussions).where(eq(discussions.eventId, victimEvent!.id));
  const postId = await mkPost({ discussionId: discussion!.id });
  const id = await fileReport('post', { postId });
  assert.ok((await listed('/api/report/admin/all', victimMgr)).some((r) => r._id === id), "in the event manager's list");
  assert.ok((await listed(`/api/report/event/${victimEvent!.id}/reports`, victimMgr)).some((r) => r._id === id), "in the event's list");
  assert.ok(!(await listed('/api/report/admin/all', evilMgr)).some((r) => r._id === id), "in another manager's list");
  assert.deepEqual(await listed('/api/report/admin/all?type=user', victimMgr), [], 'a manager filtering to user reports');
  assert.equal((await setStatus(id, 'rejected', evilMgr)).status, 403, 'manager of another event');
  assert.equal((await setStatus(id, 'rejected', victimMgr)).status, 200, 'event manager');
});

await check('admins see reports of every type, post reports included, and resolving one about a user bans the user', async () => {
  const troll = await mkUser('troll', UserRole.Volunteer);
  const postReport = await fileReport('post', { postId: await mkPost({ eventId: victimEvent!.id }) });
  const userReport = await fileReport('user', { targetId: troll.id });
  const eventReport = await fileReport('event', { eventId: victimEvent!.id });

  const onlyPosts = await listed('/api/report/admin/all?type=post', victimAdmin);
  assert.ok(onlyPosts.some((r) => r._id === postReport), 'filtered to posts');
  assert.ok(onlyPosts.every((r) => r.targetType === 'post'));
  const all = (await listed('/api/report/admin/all', victimAdmin)).map((r) => r._id);
  assert.ok([postReport, userReport, eventReport].every((id) => all.includes(id)), 'unfiltered, all three types');

  assert.equal((await setStatus(userReport, 'resolved', victimAdmin)).status, 200);
  assert.equal((await userRow(troll.id))?.isBanned, true, 'the reported user is banned');
});

// --- bans apply to tokens issued before the ban --------------------------

await check('banned user is rejected mid-session', async () => {
  const ok = await fetch(`${base}/api/auth/me`, { headers: H });
  assert.equal(ok.status, 200, 'valid token should work before the ban');
  await db.update(users).set({ isBanned: true, bannedReason: 'test' }).where(eq(users.id, attacker.id));
  const res = await fetch(`${base}/api/notifications`, { headers: H });
  assert.equal(res.status, 403, 'existing token still worked after the ban');
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'AUTHZ CHECK FAILED' : 'AUTHZ CHECK PASSED');

// Events and registrations go with their managers and volunteers, reports with their reporter.
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
await rm(path.join(UPLOADS_DIR, imageName), { force: true });
server.close();
await closeDb();
process.exit();
