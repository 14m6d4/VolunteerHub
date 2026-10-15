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

// --- event and registration notifications ---------------------------------

const admin2 = await mkUser('admin2', 'admin');
const about = async (token: string, type: string, eventId: string) =>
  (await mine(token, '?limit=100')).filter((n) => n.type === type && n.data?.eventId === eventId);

await check('a new event reaches every admin but the one who created it, and approval reaches its manager', async () => {
  const byMgr = await call('POST', '/api/events', { title: `zz_pend_${stamp}`, startAt: inDays(3), location: 'Hanoi' }, mgr.token);
  assert.equal(byMgr.status, 201, JSON.stringify(byMgr.data));
  const evId = byMgr.data.data._id;
  for (const a of [admin, admin2]) {
    const [n, ...more] = await about(a.token, 'event_pending', evId);
    assert.ok(n && !more.length, 'each admin exactly once');
    assert.equal(n.title, 'Event Pending Approval');
    assert.equal(n.body, `New event zz_pend_${stamp} is pending your approval`);
    assert.equal(n.actor._id, mgr.id);
  }

  const byAdmin = await call('POST', '/api/events', { title: `zz_own_${stamp}`, startAt: inDays(3), location: 'Hanoi' }, admin.token);
  assert.equal(byAdmin.status, 201);
  assert.deepEqual(await about(admin.token, 'event_pending', byAdmin.data.data._id), [], 'not their own event');
  assert.equal((await about(admin2.token, 'event_pending', byAdmin.data.data._id)).length, 1);

  assert.equal((await call('PATCH', `/api/events/${evId}/approve`, undefined, admin2.token)).status, 200);
  const [approved, ...again] = await about(mgr.token, 'event_approved', evId);
  assert.ok(approved && !again.length);
  assert.equal(approved.title, 'Event Approved');
  assert.equal(approved.body, `Your event zz_pend_${stamp} has been approved`);
  assert.equal(approved.actor._id, admin2.id, 'the approving admin');
});

await check('registrations reach the manager, and their outcomes reach the volunteer, with the actor', async () => {
  const evId = await mkApprovedEvent('regs');
  const regs: Record<string, string> = {};
  for (const [n, u] of [['vol', vol], ['vol2', vol2], ['vol3', vol3]] as const) {
    const r = await call('POST', `/api/register/${evId}`, undefined, u.token);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    regs[n] = r.data.data._id;
  }
  const pending = await about(mgr.token, 'registration_pending', evId);
  assert.equal(pending.length, 3);
  const fromVol = pending.find((n) => n.actor?._id === vol.id);
  assert.ok(fromVol, 'the volunteer is the actor');
  assert.equal(fromVol.title, 'New Registration Request');
  assert.equal(fromVol.body, `vol has registered for event "zz_regs_${stamp}"`);
  assert.equal(fromVol.data.registrationId, regs.vol);

  assert.equal((await call('POST', `/api/register/${regs.vol}/approve`, undefined, mgr.token)).status, 200);
  assert.equal((await call('POST', `/api/register/${regs.vol2}/approve`, undefined, mgr.token)).status, 200);
  assert.equal((await call('POST', `/api/register/${regs.vol3}/reject`, undefined, mgr.token)).status, 200);
  const [joined] = await about(vol.token, 'event_joined', evId);
  assert.equal(joined.title, 'Registration Approved');
  assert.equal(joined.actor._id, mgr.id);
  const [rejected, ...kicked] = [...await about(vol3.token, 'registration_rejected', evId), ...await about(vol3.token, 'event_kicked', evId)];
  assert.ok(rejected && !kicked.length, 'rejection has its own kind');
  assert.equal(rejected.title, 'Registration Rejected');
  assert.equal(rejected.body, `Your registration for event zz_regs_${stamp} was rejected`);
  assert.equal(rejected.actor._id, mgr.id);

  assert.equal((await call('PUT', `/api/events/${evId}`, { description: 'new' }, mgr.token)).status, 200);
  for (const u of [vol, vol2]) {
    const updated = await about(u.token, 'event_updated', evId);
    assert.equal(updated.length, 1, 'each approved member exactly once');
    assert.equal(updated[0].body, `Event zz_regs_${stamp} just got updated`);
    assert.equal(updated[0].actor._id, mgr.id);
  }
  assert.deepEqual(await about(mgr.token, 'event_updated', evId), [], 'not the manager who edited it');
  assert.deepEqual(await about(vol3.token, 'event_updated', evId), [], 'not the rejected');

  assert.equal((await call('POST', `/api/register/${regs.vol2}/kick`, undefined, mgr.token)).status, 200);
  const [removed] = await about(vol2.token, 'event_kicked', evId);
  assert.equal(removed.title, 'You have been removed from the event');
  assert.equal(removed.actor._id, mgr.id);

  assert.equal((await call('PATCH', `/api/events/${evId}/complete`, undefined, mgr.token)).status, 200);
  const done = await about(vol.token, 'event_completed', evId);
  assert.equal(done.length, 1);
  assert.equal(done[0].body, `Event zz_regs_${stamp} has been marked as completed. Thank you for your participation!`);
  assert.deepEqual(await about(vol2.token, 'event_completed', evId), [], 'not a removed member');
});

// --- preferences ----------------------------------------------------------

await check('the notification switches are honoured: all off hears nothing, event updates off still hears outcomes', async () => {
  const quiet = await mkUser('quiet', 'volunteer');
  const noEdits = await mkUser('noedits', 'volunteer');
  const quietAdmin = await mkUser('quietadmin', 'admin');
  const prefs = async (u: { token: string }, body: object) =>
    assert.equal((await call('PATCH', '/api/users/profile/secure', body, u.token)).status, 200);
  await prefs(quiet, { notificationsEnabled: false });
  await prefs(noEdits, { notifyOnEventUpdate: false });
  await prefs(quietAdmin, { notificationsEnabled: false });

  const evId = await mkApprovedEvent('prefs');
  assert.deepEqual(await about(quietAdmin.token, 'event_pending', evId), [], 'an opted-out admin is skipped');
  assert.equal((await about(admin2.token, 'event_pending', evId)).length, 1, 'the other admins still hear');

  const regs: string[] = [];
  for (const u of [quiet, noEdits]) {
    const r = await call('POST', `/api/register/${evId}`, undefined, u.token);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    regs.push(r.data.data._id);
    assert.equal((await call('POST', `/api/register/${r.data.data._id}/approve`, undefined, mgr.token)).status, 200);
  }
  assert.equal((await call('PUT', `/api/events/${evId}`, { description: 'edited' }, mgr.token)).status, 200);
  assert.equal((await call('PATCH', `/api/events/${evId}/complete`, undefined, mgr.token)).status, 200);

  assert.deepEqual(await mine(quiet.token, '?limit=100'), [], 'notifications off means none at all');
  assert.deepEqual(await about(noEdits.token, 'event_updated', evId), [], 'no event edits');
  assert.equal((await about(noEdits.token, 'event_joined', evId)).length, 1, 'still the registration outcome');
  assert.equal((await about(noEdits.token, 'event_completed', evId)).length, 1, 'still the completion');
});

// --- reports --------------------------------------------------------------

const mgr2 = await mkUser('mgr2', 'manager');
const reportEv = await mkApprovedEvent('reported');
const reportedPost = await mkPost(reportEv, vol.token, 'a post that will be reported for being long enough to be cut in a preview of fifty characters');
const heard = async (token: string, type: string, reportId: string) => {
  const found = (await mine(token, '?limit=100')).find((n) => n.type === type && n.data?.reportId === reportId);
  assert.ok(found, `${type} for report ${reportId}`);
  return found;
};

let eventReport: any;
let userReport: any;
let postReport: any;
await check('events, users and posts can be reported, and the people who act on them are told', async () => {
  const ev = await call('POST', '/api/report/event', { eventId: reportEv, reason: 'spam', description: 'looks fake' }, vol2.token);
  assert.equal(ev.status, 201, JSON.stringify(ev.data));
  eventReport = ev.data;
  assert.ok(eventReport._id);
  assert.equal(eventReport.reporter, vol2.id);
  assert.equal(eventReport.targetId, reportEv);
  assert.equal(eventReport.targetType, 'event');
  assert.equal(eventReport.reason, 'spam');
  assert.equal(eventReport.description, 'looks fake');
  assert.equal(eventReport.status, 'pending');
  assert.ok(eventReport.createdAt && eventReport.updatedAt);

  const us = await call('POST', '/api/report/user', { targetId: vol3.id, reason: 'abuse' }, vol2.token);
  assert.equal(us.status, 201, JSON.stringify(us.data));
  userReport = us.data;
  assert.equal(userReport.targetType, 'user');
  assert.equal(userReport.targetId, vol3.id);
  assert.equal(userReport.description, undefined, 'no description, no key');

  const po = await call('POST', '/api/report/post', { postId: reportedPost, reason: 'offensive' }, vol2.token);
  assert.equal(po.status, 201, JSON.stringify(po.data));
  postReport = po.data;
  assert.equal(postReport.targetType, 'post');
  assert.equal(postReport.targetId, reportedPost);

  assert.equal((await call('POST', '/api/report/event', { eventId: reportEv, reason: 'x' })).status, 401, 'anonymous');
  const noEvent = await call('POST', '/api/report/event', { eventId: NO_SUCH_ID, reason: 'x' }, vol2.token);
  assert.deepEqual([noEvent.status, noEvent.data.status, noEvent.data.message], [404, 404, 'Event not found'], 'the central handler answers');
  const noUser = await call('POST', '/api/report/user', { targetId: NO_SUCH_ID, reason: 'x' }, vol2.token);
  assert.deepEqual([noUser.status, noUser.data.message], [404, 'User not found']);
  const noPost = await call('POST', '/api/report/post', { postId: NO_SUCH_ID, reason: 'x' }, vol2.token);
  assert.deepEqual([noPost.status, noPost.data.message], [404, 'Post not found']);
  // A malformed id counts as unknown, as everywhere else.
  assert.equal((await call('POST', '/api/report/event', { eventId: 'nope', reason: 'x' }, vol2.token)).status, 404);
  assert.equal((await call('POST', '/api/report/user', { targetId: 'nope', reason: 'x' }, vol2.token)).status, 404);
  assert.equal((await call('POST', '/api/report/post', { postId: reportedPost }, vol2.token)).status, 400, 'a report needs a reason');
  const viaUsers = await call('POST', '/api/users/report-user', { targetId: vol3.id, reason: 'again' }, vol2.token);
  assert.equal(viaUsers.status, 201, JSON.stringify(viaUsers.data));
  assert.equal((await call('POST', '/api/users/report-user', { targetId: NO_SUCH_ID, reason: 'x' }, vol2.token)).status, 404);

  const adminHeard = await heard(admin.token, 'event_report', eventReport._id);
  assert.equal(adminHeard.title, 'Event Reported');
  assert.equal(adminHeard.body, `Event zz_reported_${stamp} has been reported for the following reason: spam`);
  assert.equal(adminHeard.data.eventId, reportEv);
  const userHeard = await heard(admin.token, 'user_report', userReport._id);
  assert.equal(userHeard.title, 'User Reported');
  assert.equal(userHeard.body, `User zz_vol3_${stamp} has been reported. Reason: abuse`);
  assert.equal(userHeard.data.targetUserId, vol3.id);
  const managerHeard = await heard(mgr.token, 'post_report', postReport._id);
  assert.equal(managerHeard.title, 'Post Reported');
  assert.equal(managerHeard.data.postId, reportedPost);
});

await check('admins list every report, managers the reports on their posts; others are turned away', async () => {
  const adminList = await call('GET', '/api/report/admin/all', undefined, admin.token);
  assert.equal(adminList.status, 200, JSON.stringify(adminList.data));
  const ours = adminList.data.filter((r: any) => r.reporter._id === vol2.id && r.reason !== 'again');
  assert.deepEqual(ours.map((r: any) => r._id), [postReport._id, userReport._id, eventReport._id], 'newest first, post reports included');
  assert.equal(ours[1].reporter.username, `zz_vol2_${stamp}`);
  assert.equal(ours[1].reporter.name, 'vol2');
  assert.deepEqual(ours[0].targetDetails, { contentPreview: 'a post that will be reported for being long enough' });
  assert.deepEqual(ours[1].targetDetails, { username: `zz_vol3_${stamp}`, name: 'vol3' });
  assert.deepEqual(ours[2].targetDetails, { title: `zz_reported_${stamp}` });
  assert.equal(ours[2].status, 'pending');
  assert.equal(ours[2].targetId, reportEv);

  const onlyUsers = (await call('GET', '/api/report/admin/all?type=user', undefined, admin.token)).data;
  assert.ok(onlyUsers.length >= 1 && onlyUsers.every((r: any) => r.targetType === 'user'));
  const resolved = (await call('GET', '/api/report/admin/all?status=resolved', undefined, admin.token)).data;
  assert.ok(!resolved.some((r: any) => r._id === eventReport._id));
  const pending = (await call('GET', '/api/report/admin/all?status=pending&type=all', undefined, admin.token)).data;
  assert.ok(pending.some((r: any) => r._id === eventReport._id));

  const managerList = await call('GET', '/api/report/admin/all', undefined, mgr.token);
  assert.equal(managerList.status, 200, JSON.stringify(managerList.data));
  assert.deepEqual(managerList.data.map((r: any) => [r._id, r.targetType, r.reporter.username]), [[postReport._id, 'post', `zz_vol2_${stamp}`]]);
  assert.deepEqual((await call('GET', '/api/report/admin/all?status=resolved', undefined, mgr.token)).data, []);
  assert.deepEqual((await call('GET', '/api/report/admin/all', undefined, mgr2.token)).data, [], 'another manager sees none of them');

  assert.equal((await call('GET', '/api/report/admin/all', undefined, vol.token)).status, 403);
  assert.equal((await call('GET', '/api/report/admin/all')).status, 401);
});

await check('an event\'s post reports go to its manager and admins; by-target lookups are admin-only', async () => {
  const forManager = await call('GET', `/api/report/event/${reportEv}/reports`, undefined, mgr.token);
  assert.equal(forManager.status, 200, JSON.stringify(forManager.data));
  assert.deepEqual(forManager.data.map((r: any) => r._id), [postReport._id]);
  assert.equal(forManager.data[0].reporter.username, `zz_vol2_${stamp}`);
  assert.deepEqual((await call('GET', `/api/report/event/${reportEv}/reports`, undefined, admin.token)).data.map((r: any) => r._id), [postReport._id]);
  assert.equal((await call('GET', `/api/report/event/${reportEv}/reports`, undefined, mgr2.token)).status, 403, 'not their event');
  assert.equal((await call('GET', `/api/report/event/${reportEv}/reports`, undefined, vol.token)).status, 403);
  assert.equal((await call('GET', `/api/report/event/${NO_SUCH_ID}/reports`, undefined, mgr.token)).status, 404);
  assert.deepEqual((await call('GET', `/api/report/event/${NO_SUCH_ID}/reports`, undefined, admin.token)).data, []);

  const byEvent = await call('GET', `/api/report/event/${reportEv}`, undefined, admin.token);
  assert.equal(byEvent.status, 200, JSON.stringify(byEvent.data));
  assert.deepEqual(byEvent.data.map((r: any) => r._id), [eventReport._id]);
  assert.deepEqual((await call('GET', `/api/report/post/${reportedPost}`, undefined, admin.token)).data.map((r: any) => r._id), [postReport._id]);
  assert.equal((await call('GET', `/api/report/event/${reportEv}`, undefined, mgr.token)).status, 403);

  const listing = await call('GET', `/api/events?q=${encodeURIComponent(`zz_reported_${stamp}`)}`, undefined, mgr.token);
  assert.equal(listing.status, 200, JSON.stringify(listing.data));
  assert.equal(listing.data.items[0].pendingReportsCount, 1, 'the event list counts pending post reports');
});

await check('resolving or rejecting a report tells the reporter; a resolved post report deletes the post and a user report bans', async () => {
  assert.equal((await call('PATCH', `/api/report/${postReport._id}`, { status: 'resolved' }, mgr2.token)).status, 403, 'a manager of another event does not resolve');
  assert.equal((await call('PATCH', `/api/report/${postReport._id}`, { status: 'resolved' })).status, 401);
  assert.equal((await call('PATCH', `/api/report/${postReport._id}`, { status: 'pending' }, admin.token)).status, 400, 'only resolved or rejected');
  assert.equal((await call('PATCH', `/api/report/${NO_SUCH_ID}`, { status: 'resolved' }, admin.token)).status, 404, 'unknown report');
  assert.equal((await call('PATCH', '/api/report/not-an-id', { status: 'resolved' }, admin.token)).status, 404, 'malformed id');

  const rejected = await call('PATCH', `/api/report/${eventReport._id}`, { status: 'rejected' }, admin.token);
  assert.equal(rejected.status, 200, JSON.stringify(rejected.data));
  assert.equal(rejected.data.status, 'rejected');
  assert.equal(rejected.data.reporter._id, vol2.id, 'the reporter comes back populated');
  assert.equal(rejected.data.reporter.username, `zz_vol2_${stamp}`);
  const noWord = await heard(vol2.token, 'report_rejected', eventReport._id);
  assert.equal(noWord.title, 'Report Rejected');
  assert.deepEqual(noWord.data, { reportId: eventReport._id, targetType: 'event', targetId: reportEv, eventId: reportEv });

  const resolvedPost = await call('PATCH', `/api/report/${postReport._id}`, { status: 'resolved' }, admin.token);
  assert.equal(resolvedPost.status, 200, JSON.stringify(resolvedPost.data));
  assert.equal(resolvedPost.data.status, 'resolved');
  const told = await heard(vol2.token, 'report_resolved', postReport._id);
  assert.equal(told.title, 'Report Resolved');
  assert.deepEqual(told.data, { reportId: postReport._id, targetType: 'post', targetId: reportedPost, eventId: reportEv, postId: reportedPost });
  assert.equal((await call('GET', `/api/posts/${reportedPost}`, undefined, vol.token)).status, 404, 'the post is gone');
  assert.deepEqual((await call('GET', `/api/report/post/${reportedPost}`, undefined, admin.token)).data.map((r: any) => r.status), ['resolved'], 'the report outlives the post');

  assert.equal((await call('PATCH', `/api/report/${userReport._id}`, { status: 'resolved' }, admin.token)).status, 200);
  const banned = await call('GET', '/api/users/admin/banned', undefined, admin.token);
  const hit = banned.data.data.find((u: any) => u._id === vol3.id);
  assert.ok(hit, 'the reported user is banned');
  assert.equal(hit.bannedReason, `Banned due to Report #${userReport._id}: abuse`);
});

// --- admin analytics ------------------------------------------------------

const analytics = async () => {
  const res = await call('GET', '/api/admin/analytics', undefined, admin.token);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.status, 'success');
  return res.data.data;
};
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

await check('analytics count what the platform holds, per month for the last year, and are for admins only', async () => {
  assert.equal((await call('GET', '/api/admin/analytics')).status, 401);
  assert.equal((await call('GET', '/api/admin/analytics', undefined, mgr.token)).status, 403);

  const before = await analytics();
  const fresh = await mkUser('analytics', 'volunteer');
  const shown = await mkApprovedEvent('analytics_a');
  const waiting = await call('POST', '/api/events', {
    title: `zz_analytics_b_${stamp}`, startAt: inDays(3), endAt: inDays(4), location: 'Hanoi',
  }, mgr.token);
  assert.equal(waiting.status, 201);
  const reg = await call('POST', `/api/register/${shown}`, undefined, fresh.token);
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  assert.equal((await call('POST', `/api/register/${reg.data.data._id}/approve`, undefined, mgr.token)).status, 200);
  await mkPost(shown, fresh.token);
  const reason = `zz_reason_${stamp}`;
  assert.equal((await call('POST', '/api/report/event', { eventId: shown, reason }, fresh.token)).status, 201);

  const after = await analytics();
  const delta = (pick: (a: any) => number) => pick(after) - pick(before);
  assert.equal(delta((a) => a.statistics.totalUsers), 1);
  assert.equal(delta((a) => a.statistics.totalEvents), 2);
  assert.equal(delta((a) => a.statistics.activeVolunteers), 1, 'approved in an event that is still on');
  assert.equal(delta((a) => a.statistics.completedEvents), 0);
  assert.equal(delta((a) => a.statistics.pendingReports), 1);
  assert.equal(delta((a) => a.statistics.totalPosts), 1);

  assert.equal(after.userGrowth.length, 12);
  assert.equal(after.userGrowth[11].month, monthNames[new Date().getMonth()], 'ends with this month');
  assert.equal(delta((a) => a.userGrowth[11].users), 1);
  assert.equal(after.eventsPerMonth.length, 12);
  assert.equal(delta((a) => a.eventsPerMonth[11].events), 2);
  assert.equal(after.volunteerParticipation.length, 12);
  assert.equal(delta((a) => a.volunteerParticipation[11].volunteers), 2, 'the volunteer, and the manager who joins their event on approval');

  assert.deepEqual(after.eventsByStatus.map((s: any) => s.name), ['Active', 'Completed', 'Pending']);
  assert.equal(delta((a) => a.eventsByStatus[0].value), 1);
  assert.equal(delta((a) => a.eventsByStatus[2].value), 1);

  assert.ok(after.reportsDistribution.some((r: any) => r.type === reason && r.count === 1));
  const counts = after.reportsDistribution.map((r: any) => r.count);
  assert.deepEqual(counts, counts.slice().sort((a: number, b: number) => b - a), 'most common reason first');

  assert.ok(after.topEventCategories.length <= 5);
  assert.ok(after.topEventCategories.every((c: any) => typeof c.category === 'string' && c.count > 0));
  const categoryCounts = after.topEventCategories.map((c: any) => c.count);
  assert.deepEqual(categoryCounts, categoryCounts.slice().sort((a: number, b: number) => b - a));
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'NOTIFICATIONS CHECK FAILED' : 'NOTIFICATIONS CHECK PASSED');

// Notifications, reports and everything else hang off their users.
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
await closeDb();
process.exit();
