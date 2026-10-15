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
import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import app from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import { comments, discussions, events, posts, registrations, users } from '../db/schema.ts';
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

// Events and registrations go with their managers and volunteers.
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
await closeDb();
process.exit();
