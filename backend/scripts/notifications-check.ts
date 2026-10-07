/**
 * Exercises notifications, reports and the admin analytics end to end against a
 * real PostgreSQL. Same shape as users-check, events-check and social-check: boot
 * the exported app on an ephemeral port and assert on HTTP responses.
 *
 * Needs a migrated PostgreSQL (DATABASE_URL). Run with: npm run check:notifications
 * Fixtures are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import 'dotenv/config';
import { like } from 'drizzle-orm';
import app from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import { users } from '../db/schema.ts';
import { hashPassword } from '../utils/password.util.ts';
import { createAccessToken } from '../utils/jwt.util.ts';
import { UserRole } from '../types/user.ts';

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
      'CF-Connecting-IP': `10.3.${caller >> 8}.${caller++ & 255}`,
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

// --- notifications --------------------------------------------------------

const mine = async (token: string, query = '') => {
  const res = await call('GET', `/api/notifications${query}`, undefined, token);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return res.data.data.notifications as any[];
};
const unread = async (token: string) => (await call('GET', '/api/notifications/unread/count', undefined, token)).data.data.count;

let firstId = '';
let secondId = '';
await check('notifications are listed newest first with the actor, counted, and marked read', async () => {
  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: vol2.id }, vol.token)).status, 201);
  assert.equal((await call('POST', '/api/users/friends/request', { receiverId: vol2.id }, vol3.token)).status, 201);

  assert.equal((await call('GET', '/api/notifications')).status, 401, 'anonymous');
  const list = await mine(vol2.token);
  assert.equal(list.length, 2);
  const [newest, oldest] = list;
  secondId = newest._id;
  firstId = oldest._id;
  assert.ok(firstId && secondId && firstId !== secondId);
  assert.equal(newest.user, vol2.id);
  assert.equal(newest.type, 'friend_request_received');
  assert.equal(newest.title, 'New friend request');
  assert.equal(newest.body, 'You received a friend request');
  assert.deepEqual(newest.data, { senderId: vol3.id });
  assert.equal(newest.isRead, false);
  assert.ok(newest.createdAt && newest.updatedAt);
  assert.equal(newest.actor._id, vol3.id, 'actor is populated');
  assert.equal(newest.actor.username, `zz_vol3_${stamp}`);
  assert.equal(newest.actor.name, 'vol3');
  assert.equal(oldest.actor._id, vol.id);
  assert.deepEqual(await mine(vol.token), [], 'only your own');

  assert.deepEqual((await mine(vol2.token, '?limit=1')).map((n) => n._id), [secondId]);
  assert.deepEqual((await mine(vol2.token, '?skip=1&limit=1')).map((n) => n._id), [firstId]);

  assert.equal(await unread(vol2.token), 2);
  const read = await call('PATCH', `/api/notifications/${firstId}/read`, undefined, vol2.token);
  assert.equal(read.status, 200, JSON.stringify(read.data));
  assert.equal(read.data.data.notification._id, firstId);
  assert.equal(read.data.data.notification.isRead, true);
  assert.equal(await unread(vol2.token), 1);
  assert.equal((await call('PATCH', `/api/notifications/${secondId}/read`, undefined, vol.token)).status, 404, "not someone else's");
  assert.equal((await call('PATCH', `/api/notifications/${NO_SUCH_ID}/read`, undefined, vol2.token)).status, 404);
  assert.equal((await call('PATCH', '/api/notifications/not-an-id/read', undefined, vol2.token)).status, 404);

  assert.equal((await call('PATCH', '/api/notifications/mark-all-read', undefined, vol2.token)).status, 200);
  assert.equal(await unread(vol2.token), 0);
  assert.ok((await mine(vol2.token)).every((n) => n.isRead));
});

await check('system notifications carry no actor, and deleting is for their owner', async () => {
  const evId = await mkApprovedEvent('notify');
  const postId = await mkPost(evId, vol.token);
  assert.equal((await call('POST', `/api/posts/${postId}/like`, undefined, vol2.token)).status, 200);

  const [liked] = await mine(vol.token);
  assert.equal(liked.type, 'post_liked');
  assert.equal(liked.title, 'Post Liked');
  assert.equal(liked.body, 'vol2 liked your post');
  assert.deepEqual(liked.data, { postId, userId: vol2.id, actorName: 'vol2', eventId: evId });
  assert.equal(liked.actor, undefined);
  assert.equal(liked.isRead, false);

  assert.equal((await call('DELETE', `/api/notifications/${liked._id}`, undefined, vol2.token)).status, 404, "not someone else's");
  assert.equal((await call('DELETE', `/api/notifications/${liked._id}`, undefined, vol.token)).status, 200);
  assert.equal((await call('DELETE', `/api/notifications/${liked._id}`, undefined, vol.token)).status, 404, 'already gone');
  assert.deepEqual(await mine(vol.token), []);

  assert.equal((await call('POST', `/api/posts/${postId}/like`, undefined, vol2.token)).status, 200, 'unlike');
  assert.equal((await call('POST', `/api/posts/${postId}/like`, undefined, vol3.token)).status, 200);
  assert.equal((await call('DELETE', '/api/notifications', undefined, vol2.token)).status, 200);
  assert.deepEqual(await mine(vol2.token), [], 'everything of vol2 is gone');
  assert.equal((await mine(vol.token)).length, 1, 'but not vol\'s');
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'NOTIFICATIONS CHECK FAILED' : 'NOTIFICATIONS CHECK PASSED');

// Notifications, reports and everything else hang off their users.
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
await closeDb();
process.exit();
