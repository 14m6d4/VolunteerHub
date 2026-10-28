/**
 * Exercises events and registrations end to end against a real PostgreSQL:
 * creating and listing events (public and personalised), the manager's own-event
 * scoping, and the volunteer registration flow with its member counter. Same
 * shape as users-check: boot the exported app on an ephemeral port and assert on
 * HTTP responses. Cross-user authorization lives in authz-check.
 *
 * Needs a migrated PostgreSQL (DATABASE_URL). Run with: npm run check:events
 * Fixtures are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import app from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import { events, registrations, users } from '../db/schema.ts';
import { EventService } from '../services/event.service.ts';
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
      'CF-Connecting-IP': `10.1.${caller >> 8}.${caller++ & 255}`,
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
const otherMgr = await mkUser('othermgr', 'manager');
const vol = await mkUser('vol', 'volunteer');
const vol2 = await mkUser('vol2', 'volunteer');
const vol3 = await mkUser('vol3', 'volunteer');

const DAY = 864e5;
const inDays = (d: number) => new Date(Date.now() + d * DAY).toISOString();
const title = (n: string) => `zz_${n}_${stamp}`;

/** Creates through the API as a manager, then has the admin approve it. */
const mkApprovedEvent = async (n: string, extra: Record<string, unknown> = {}) => {
  const created = await call('POST', '/api/events', {
    title: title(n), startAt: inDays(3), endAt: inDays(4), location: 'Hanoi', ...extra,
  }, mgr.token);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id: string = created.data.data._id;
  const approved = await call('PATCH', `/api/events/${id}/approve`, undefined, admin.token);
  assert.equal(approved.status, 200, JSON.stringify(approved.data));
  return id;
};
const eventRow = async (id: string) => (await db.select().from(events).where(eq(events.id, id)))[0]!;
const regRow = async (id: string) => (await db.select().from(registrations).where(eq(registrations.id, id)))[0];

// --- creating and reading events -----------------------------------------

let evId = '';
await check('a manager creates an event, which waits for admin approval', async () => {
  const res = await call('POST', '/api/events', {
    title: title('clean'), description: 'Beach cleanup', location: 'Do Son', startAt: inDays(10), endAt: inDays(11),
    tags: ['Environment', 'Community'], maxMembers: 5, isPublic: 'true',
  }, mgr.token);
  assert.equal(res.status, 201, JSON.stringify(res.data));
  const e = res.data.data;
  evId = e._id;
  assert.ok(evId);
  assert.equal(e.id, evId, 'virtual id alongside _id');
  assert.equal(e.title, title('clean'));
  assert.equal(e.status, 'pending');
  assert.equal(e.currentMembers, 0);
  assert.equal(e.isFull, false);
  assert.equal(e.isPublic, true);
  assert.equal(e.managerId, mgr.id);
  assert.deepEqual(e.tags, ['Environment', 'Community']);
  assert.equal(e.maxMembers, 5);
  assert.ok(e.createdAt && e.updatedAt);

  assert.equal((await call('POST', '/api/events', { title: 'x', startAt: inDays(1) }, mgr.token)).status, 400, 'short title');
  assert.equal((await call('POST', '/api/events', { title: title('v'), startAt: inDays(1) }, vol.token)).status, 403, 'volunteer');
  assert.equal((await call('POST', '/api/events', { title: title('a'), startAt: inDays(1) })).status, 401, 'anonymous');
});

await check('an event is read by id with its manager, and a bad id is a 404', async () => {
  const res = await call('GET', `/api/events/${evId}`);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const { event, conflictingEvents, hasConflict } = res.data.data;
  assert.equal(event._id, evId);
  assert.equal(event.title, title('clean'));
  assert.equal(event.managerId._id, mgr.id, 'manager is populated');
  assert.equal(event.managerId.name, 'mgr');
  assert.equal(event.managerId.email, `zz_mgr_${stamp}@test.local`);
  assert.deepEqual(conflictingEvents, []);
  assert.equal(hasConflict, false);

  assert.equal((await call('GET', '/api/events/not-an-id')).status, 404);
  assert.equal((await call('GET', '/api/events/00000000-0000-4000-8000-000000000000')).status, 404);
});

await check('the manager updates their own event and members hear about it', async () => {
  const res = await call('PUT', `/api/events/${evId}`, { title: title('clean2'), maxMembers: 3 }, mgr.token);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.data.title, title('clean2'));
  assert.equal(res.data.data.maxMembers, 3);
  assert.equal((await eventRow(evId)).title, title('clean2'));
  assert.equal((await call('PUT', `/api/events/${evId}`, { title: 'zz' }, mgr.token)).status, 400, 'validated');
  assert.equal((await call('PUT', '/api/events/00000000-0000-4000-8000-000000000000', { title: title('none') }, mgr.token)).status, 404);
  await call('PUT', `/api/events/${evId}`, { title: title('clean') }, mgr.token);
});

// --- listing --------------------------------------------------------------

await check('listing: search, tag, status, start date, ordering and pagination', async () => {
  const a = await mkApprovedEvent('list_a', { tags: ['Health'], startAt: inDays(20), endAt: inDays(21), description: 'Free checkups' });
  const b = await mkApprovedEvent('list_b', { tags: ['Health', 'Senior Care'], startAt: inDays(30), endAt: inDays(31) });

  const q = await call('GET', `/api/events?q=${encodeURIComponent(`zz_list_`)}`);
  assert.equal(q.status, 200, JSON.stringify(q.data));
  assert.equal(q.data.success, true);
  assert.equal(q.data.total, 2);
  assert.equal(q.data.page, 1);
  assert.equal(q.data.limit, 20);
  assert.deepEqual(q.data.items.map((e: any) => e._id), [b, a], 'latest start first');
  const item = q.data.items[0];
  assert.equal(item.id, item._id);
  assert.equal(typeof item.isFull, 'boolean');
  assert.deepEqual(item.requests, []);
  assert.equal(item.pendingReportsCount, 0);

  assert.equal((await call('GET', `/api/events?q=${encodeURIComponent('checkups')}&tag=Health`)).data.total, 1, 'description is searched');
  assert.equal((await call('GET', `/api/events?q=${stamp}&tag=Senior%20Care`)).data.total, 1);
  assert.equal((await call('GET', `/api/events?q=${stamp}&tag=Sports`)).data.total, 0);
  assert.equal((await call('GET', `/api/events?q=${stamp}&status=approved,finished`)).data.total, 2);
  assert.equal((await call('GET', `/api/events?q=${stamp}&status=nonsense`)).data.total, 0);
  assert.equal((await call('GET', `/api/events?q=${stamp}&status=pending`, undefined, admin.token)).data.total, 1);
  assert.equal((await call('GET', `/api/events?q=${stamp}&status=all`, undefined, admin.token)).data.total, 3);
  assert.equal((await call('GET', `/api/events?q=${stamp}&startFrom=${encodeURIComponent(inDays(25))}`)).data.total, 1);

  const p1 = await call('GET', `/api/events?q=${stamp}&limit=2&page=1`, undefined, admin.token);
  const p2 = await call('GET', `/api/events?q=${stamp}&limit=2&page=2`, undefined, admin.token);
  assert.equal(p1.data.items.length, 2);
  assert.equal(p2.data.items.length, 1);
  assert.notEqual(p2.data.items[0]._id, p1.data.items[0]._id);
  assert.equal(p1.data.total, 3);
  assert.equal(p2.data.page, 2);
  assert.equal((await call('GET', `/api/events?q=${stamp}&limit=1000`)).data.limit, 100, 'limit is capped');

  assert.equal((await call('GET', `/api/events?q=${encodeURIComponent('%')}`)).data.total, 0, '% is a literal');
  assert.equal((await call('GET', '/api/events?managerId=not-an-id')).data.total, 0);
});

await check('listing shows unpublished events only to their manager and admins', async () => {
  const ids = (r: any) => r.data.items.map((e: any) => e._id);
  // evId is pending; every way of asking must leave it out for outsiders.
  for (const query of ['', '&status=all', '&status=pending', '&status=approved,pending', '&status=draft,cancelled']) {
    const url = `/api/events?q=${stamp}${query}`;
    for (const [who, token] of [['anonymous', undefined], ['volunteer', vol.token], ['another manager', otherMgr.token]] as const) {
      const res = await call('GET', url, undefined, token);
      assert.equal(res.status, 200, `${who} ${query}`);
      assert.ok(!ids(res).includes(evId), `${who} saw a pending event with "${query}"`);
    }
  }

  const mine = `/api/events?q=${stamp}&status=pending`;
  assert.deepEqual(ids(await call('GET', mine, undefined, mgr.token)), [evId]);
  assert.equal((await call('GET', mine, undefined, admin.token)).data.total, 1);
  // A manager cannot widen the view by asking for someone else's events.
  const spoof = await call('GET', `${mine}&managerId=${otherMgr.id}`, undefined, mgr.token);
  assert.equal(spoof.data.total, 0);

  // The old unfiltered dump of every event is gone (it now reads as an event id).
  assert.equal((await call('GET', '/api/events/all')).status, 404);
});

await check('the event conflict check flags an overlapping joined event', async () => {
  const x = await mkApprovedEvent('conflict_x', { startAt: inDays(40), endAt: inDays(42) });
  const y = await mkApprovedEvent('conflict_y', { startAt: inDays(41), endAt: inDays(43) });
  const reg = await call('POST', `/api/register/${x}`, undefined, vol.token);
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  assert.equal((await call('POST', `/api/register/${reg.data.data._id}/approve`, undefined, mgr.token)).status, 200);

  // The route does not attach the caller, so the personalised answer is checked at the service.
  const hit = await EventService.getEventById(y, vol.id as any);
  assert.equal(hit.hasConflict, true);
  assert.deepEqual((hit.conflictingEvents as any[]).map((e) => e.title), [title('conflict_x')]);
  assert.equal((await EventService.getEventById(x, vol.id as any)).hasConflict, false, 'not its own conflict');
  assert.equal((await EventService.getEventById(y, vol2.id as any)).hasConflict, false);
});

// --- registration flow ----------------------------------------------------

await check('registration: apply, approve, roster, and the member counter', async () => {
  const id = await mkApprovedEvent('flow', { maxMembers: 3 });
  assert.equal((await eventRow(id)).currentMembers, 1, 'approval enrols the manager');
  assert.equal((await call('GET', `/api/events?q=${title('flow')}`)).data.items[0].isFull, false);

  const reg = await call('POST', `/api/register/${id}`, undefined, vol.token);
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  const r = reg.data.data;
  assert.equal(r.status, 'pending');
  assert.equal(r.eventId, id);
  assert.equal(r.volunteerId, vol.id);
  assert.ok(r._id);
  assert.equal((await call('POST', `/api/register/${id}`, undefined, vol.token)).status, 400, 'already registered');
  assert.equal((await call('POST', `/api/register/${id}`)).status, 401);

  const pending = await call('GET', `/api/events?q=${title('flow')}`);
  assert.deepEqual(pending.data.items[0].requests, [{ id: vol.id }], 'pending requests are listed');

  const ok = await call('POST', `/api/register/${r._id}/approve`, undefined, mgr.token);
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.data.status, 'approved');
  assert.equal((await eventRow(id)).currentMembers, 2);

  // The manager sees contact details; a volunteer sees only the approved roster, without emails.
  const asMgr = await call('GET', `/api/register/${id}`, undefined, mgr.token);
  assert.equal(asMgr.status, 200);
  const volEntry = asMgr.data.data.find((x: any) => x.volunteerId._id === vol.id);
  assert.equal(volEntry.volunteerId.email, `zz_vol_${stamp}@test.local`);
  assert.equal(volEntry.volunteerId.username, `zz_vol_${stamp}`);
  const waiting = await call('POST', `/api/register/${id}`, undefined, vol3.token);
  assert.equal(waiting.status, 201);
  const asVol = await call('GET', `/api/register/${id}`, undefined, vol2.token);
  assert.equal(asVol.data.data.length, 2, 'a pending applicant is not on the public roster');
  assert.ok(asVol.data.data.every((x: any) => x.status === 'approved'));
  assert.equal((await call('GET', `/api/register/${id}`, undefined, mgr.token)).data.data.length, 3, 'the organiser sees applicants too');
  await call('DELETE', `/api/register/${id}`, undefined, vol3.token);
  assert.ok(!JSON.stringify(asVol.data).includes('@test.local'));
  assert.equal((await call('GET', `/api/register/${id}?status=pending`, undefined, mgr.token)).data.data.length, 0);

  assert.equal((await call('GET', '/api/register/00000000-0000-4000-8000-000000000000', undefined, vol.token)).status, 404);
});

await check('a full event refuses new applications and approvals', async () => {
  const id = await mkApprovedEvent('full', { maxMembers: 2 });
  const r1 = (await call('POST', `/api/register/${id}`, undefined, vol.token)).data.data._id;
  const r2 = (await call('POST', `/api/register/${id}`, undefined, vol2.token)).data.data._id;
  assert.equal((await call('POST', `/api/register/${r1}/approve`, undefined, mgr.token)).status, 200);
  assert.equal((await eventRow(id)).currentMembers, 2);
  assert.equal((await call('GET', `/api/events?q=${title('full')}`)).data.items[0].isFull, true);
  assert.equal((await call('POST', `/api/register/${id}`, undefined, vol3.token)).status, 400, 'apply to a full event');
  const over = await call('POST', `/api/register/${r2}/approve`, undefined, mgr.token);
  assert.equal(over.status, 400);
  assert.equal((await regRow(r2))?.status, 'pending');
  assert.equal((await eventRow(id)).currentMembers, 2);
});

await check('two approvals racing for the last seat admit only one', async () => {
  const id = await mkApprovedEvent('race', { maxMembers: 2 });
  const a = (await call('POST', `/api/register/${id}`, undefined, vol.token)).data.data._id;
  const b = (await call('POST', `/api/register/${id}`, undefined, vol2.token)).data.data._id;
  const results = await Promise.all([a, b].map((r) => call('POST', `/api/register/${r}/approve`, undefined, mgr.token)));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await eventRow(id)).currentMembers, 2, 'the counter never passes max_members');
});

await check('apply is refused for events that are not open or already started', async () => {
  const pendingId = evId; // still pending
  assert.equal((await call('POST', `/api/register/${pendingId}`, undefined, vol.token)).status, 400);

  const [past] = await db.insert(events).values({
    title: title('past'), startAt: new Date(Date.now() - DAY), endAt: new Date(Date.now() + DAY),
    managerId: mgr.id, status: 'approved',
  }).returning();
  assert.equal((await call('POST', `/api/register/${past!.id}`, undefined, vol.token)).status, 400, 'started');
  assert.equal((await call('POST', '/api/register/00000000-0000-4000-8000-000000000000', undefined, vol.token)).status, 404);
  assert.equal((await call('POST', '/api/register/not-an-id', undefined, vol.token)).status, 404);
});

await check('reject, kick and cancel keep the member counter right', async () => {
  const id = await mkApprovedEvent('leave', { maxMembers: 10 });
  const mk = async (u: { token: string }) => (await call('POST', `/api/register/${id}`, undefined, u.token)).data.data._id as string;
  const rA = await mk(vol), rB = await mk(vol2), rC = await mk(vol3);
  for (const r of [rA, rB, rC]) assert.equal((await call('POST', `/api/register/${r}/approve`, undefined, mgr.token)).status, 200);
  assert.equal((await eventRow(id)).currentMembers, 4);

  const kick = await call('POST', `/api/register/${rA}/kick`, undefined, mgr.token);
  assert.equal(kick.status, 200, JSON.stringify(kick.data));
  assert.equal((await regRow(rA))?.status, 'rejected');
  assert.equal((await eventRow(id)).currentMembers, 3);
  assert.equal((await call('POST', `/api/register/${rA}/kick`, undefined, mgr.token)).status, 400, 'only approved members can be kicked');

  const cancel = await call('DELETE', `/api/register/${id}`, undefined, vol2.token);
  assert.equal(cancel.status, 200, JSON.stringify(cancel.data));
  assert.equal(cancel.data.success, true);
  assert.equal(cancel.data.message, 'Registration cancelled successfully');
  assert.equal(await regRow(rB), undefined, 'the registration is deleted');
  assert.equal((await eventRow(id)).currentMembers, 2);
  assert.equal((await call('DELETE', `/api/register/${id}`, undefined, vol2.token)).status, 404, 'nothing left to cancel');

  // A pending application is rejected without touching the counter.
  const [other] = await db.insert(registrations).values({ eventId: id, volunteerId: otherMgr.id }).returning();
  const rej = await call('POST', `/api/register/${other!.id}/reject`, undefined, mgr.token);
  assert.equal(rej.status, 200, JSON.stringify(rej.data));
  assert.equal((await regRow(other!.id))?.status, 'rejected');
  assert.equal((await eventRow(id)).currentMembers, 2);
});

await check("a volunteer's registrations list their events and hide rejected ones", async () => {
  const id = await mkApprovedEvent('mine');
  await call('POST', `/api/register/${id}`, undefined, vol3.token);
  const res = await call('GET', '/api/register/me', undefined, vol3.token);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const mineReg = res.data.data.find((r: any) => r.eventId._id === id);
  assert.equal(mineReg.status, 'pending');
  assert.equal(mineReg.eventId.title, title('mine'), 'the event is populated');
  assert.equal(mineReg.volunteerId, vol3.id);

  await db.update(registrations).set({ status: 'rejected' }).where(eq(registrations.id, mineReg._id));
  const after = await call('GET', '/api/register/me', undefined, vol3.token);
  assert.ok(!after.data.data.some((r: any) => r._id === mineReg._id));
});

await check('completing an event completes its approved registrations', async () => {
  const id = await mkApprovedEvent('done');
  const rid = (await call('POST', `/api/register/${id}`, undefined, vol.token)).data.data._id;
  await call('POST', `/api/register/${rid}/approve`, undefined, mgr.token);
  const res = await call('PATCH', `/api/events/${id}/complete`, undefined, mgr.token);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.data.status, 'finished');
  const after = await regRow(rid);
  assert.equal(after?.status, 'completed');
  assert.ok(after?.completedAt);
  const stats = await call('GET', `/api/events/${id}/stats`, undefined, mgr.token);
  assert.equal(stats.status, 200);
  assert.equal(stats.data.data.regsCount, 2);
  assert.equal(stats.data.data.currentMembers, 2);
});

await check('deleting an event removes its registrations, and a manager takes theirs along', async () => {
  const id = await mkApprovedEvent('gone');
  const rid = (await call('POST', `/api/register/${id}`, undefined, vol.token)).data.data._id;
  const del = await call('DELETE', `/api/events/${id}`, undefined, mgr.token);
  assert.equal(del.status, 200, JSON.stringify(del.data));
  assert.equal((await db.select().from(events).where(eq(events.id, id))).length, 0);
  assert.equal(await regRow(rid), undefined, 'registration went with the event');
  assert.equal((await call('DELETE', `/api/events/${id}`, undefined, mgr.token)).status, 404);

  const doomed = await mkUser('doomed', 'manager');
  const [ev] = await db.insert(events).values({ title: title('orphan'), startAt: new Date(Date.now() + DAY), managerId: doomed.id }).returning();
  const [reg] = await db.insert(registrations).values({ eventId: ev!.id, volunteerId: vol.id }).returning();
  assert.equal((await call('DELETE', `/api/users/admin/${doomed.id}`, undefined, admin.token)).status, 200);
  assert.equal((await db.select().from(events).where(eq(events.id, ev!.id))).length, 0, 'no orphaned event');
  assert.equal(await regRow(reg!.id), undefined, 'no orphaned registration');
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'EVENTS CHECK FAILED' : 'EVENTS CHECK PASSED');

// Events and registrations go with their managers and volunteers.
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
await closeDb();
process.exit();
