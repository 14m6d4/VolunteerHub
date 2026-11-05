/**
 * Calendar export and event reminders, against a real PostgreSQL:
 *   - the RFC 5545 generator (utils/ics.util.ts) on its own;
 *   - the two .ics routes over HTTP, who may download what;
 *   - the reminder pass (services/reminder.service.ts): which registrations it
 *     picks, that it reminds each once across reruns and concurrent runs, and
 *     that a new start time re-arms it.
 *
 * The reminder cases run the pass at a fake "now" in the year 2400, where only
 * this script's fixtures live, so no other data in the database is touched,
 * and they record emails instead of sending them.
 *
 * Needs a migrated PostgreSQL (DATABASE_URL). Run with: npm run check:calendar
 * Fixtures are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import 'dotenv/config';
import { and, eq, inArray, like } from 'drizzle-orm';
import app from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import { events, notifications, registrations, users } from '../db/schema.ts';
import { sendDueReminders, type ReminderEmailSender } from '../services/reminder.service.ts';
import type { EventReminderEmail } from '../services/email.service.ts';
import { UserRole } from '../types/user.ts';
import { buildCalendar, escapeText, foldLine, formatUtc, icsFilename, type IcsEvent } from '../utils/ics.util.ts';
import { createAccessToken } from '../utils/jwt.util.ts';
import { hashPassword } from '../utils/password.util.ts';

const stamp = Date.now();
const out: string[] = [];
const check = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    out.push(`  PASS  ${name}`);
  } catch (e) {
    out.push(`  FAIL  ${name}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
};

/** The content lines of an .ics, unfolded (RFC 5545 3.1). */
const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
const vevents = (ics: string) => unfold(ics).filter((l) => l === 'BEGIN:VEVENT').length;
const prop = (ics: string, name: string) =>
  unfold(ics).filter((l) => l.startsWith(`${name}:`)).map((l) => l.slice(name.length + 1));

// --- the generator ----------------------------------------------------------

const sample: IcsEvent = {
  id: '11111111-2222-4333-8444-555555555555',
  title: 'Dọn rác, bãi biển; Mỹ Khê',
  description: 'Bring gloves\\water.\nMeet at gate 2,\r\nnear the café 🌊',
  location: 'Mỹ Khê Beach, Đà Nẵng',
  // 07:30 in Vietnam (UTC+7) is 00:30 UTC.
  startAt: new Date('2026-11-05T07:30:00+07:00'),
  endAt: new Date('2026-11-05T11:00:00+07:00'),
  updatedAt: new Date('2026-11-01T10:00:00Z'),
  url: 'https://volunteerhub.example/events/11111111-2222-4333-8444-555555555555',
};
const NOW = new Date('2026-11-04T09:08:07.654Z');

await check('dates are written as UTC instants', () => {
  assert.equal(formatUtc(new Date('2026-11-05T07:30:00+07:00')), '20261105T003000Z');
  assert.equal(formatUtc(new Date('2026-12-31T23:59:59.999Z')), '20261231T235959Z');
  assert.throws(() => formatUtc(new Date('nope')), RangeError);
});

await check('TEXT values escape backslash, semicolon, comma and line breaks, and drop control characters', () => {
  assert.equal(escapeText('a\\b;c,d'), 'a\\\\b\\;c\\,d');
  assert.equal(escapeText('one\ntwo\r\nthree\rfour'), 'one\\ntwo\\nthree\\nfour');
  assert.equal(escapeText('bell\x07tab\tdel\x7F'), 'belltab\tdel');
});

await check('long lines fold at 75 octets without splitting a UTF-8 character', () => {
  const line = `DESCRIPTION:${'Tình nguyện viên 🌊 '.repeat(20)}`;
  const folded = foldLine(line);
  const physical = folded.split('\r\n');
  assert.ok(physical.length > 1, 'should have folded');
  physical.forEach((p, i) => {
    assert.ok(Buffer.byteLength(p, 'utf8') <= 75, `line ${i} is ${Buffer.byteLength(p, 'utf8')} octets`);
    if (i > 0) assert.ok(p.startsWith(' '), 'continuation starts with a space');
    assert.ok(!p.includes('�'), 'no broken character');
  });
  assert.equal(folded.replace(/\r\n /g, ''), line, 'unfolding gives the line back');
  assert.equal(foldLine('SUMMARY:short'), 'SUMMARY:short');
  const exact = `X:${'a'.repeat(73)}`;
  assert.equal(foldLine(exact), exact, 'exactly 75 octets stays on one line');
});

await check('a calendar has the required properties, CRLF endings and correct times', () => {
  const ics = buildCalendar([sample], { uidDomain: 'volunteerhub.example', name: 'My, events', now: NOW });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:'), ics.slice(0, 60));
  assert.ok(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'bare LF');
  ics.split('\r\n').forEach((l) => assert.ok(Buffer.byteLength(l, 'utf8') <= 75, `too long: ${l}`));

  assert.deepEqual(prop(ics, 'X-WR-CALNAME'), ['My\\, events']);
  assert.deepEqual(prop(ics, 'UID'), [`event-${sample.id}@volunteerhub.example`]);
  assert.deepEqual(prop(ics, 'DTSTAMP'), ['20261104T090807Z']);
  assert.deepEqual(prop(ics, 'DTSTART'), ['20261105T003000Z']);
  assert.deepEqual(prop(ics, 'DTEND'), ['20261105T040000Z']);
  assert.deepEqual(prop(ics, 'LAST-MODIFIED'), ['20261101T100000Z']);
  assert.deepEqual(prop(ics, 'SUMMARY'), ['Dọn rác\\, bãi biển\\; Mỹ Khê']);
  assert.deepEqual(prop(ics, 'LOCATION'), ['Mỹ Khê Beach\\, Đà Nẵng']);
  assert.deepEqual(prop(ics, 'URL'), [sample.url]);
  assert.deepEqual(prop(ics, 'STATUS'), ['CONFIRMED']);
  assert.deepEqual(prop(ics, 'DESCRIPTION'), [
    `Bring gloves\\\\water.\\nMeet at gate 2\\,\\nnear the café 🌊\\n\\nEvent page: ${sample.url}`,
  ]);
});

await check('no end means no DTEND, an empty location no LOCATION, and a cancelled event says so', () => {
  const ics = buildCalendar([{ ...sample, endAt: null, location: '  ', cancelled: true }], { uidDomain: 'x', now: NOW });
  assert.deepEqual(prop(ics, 'DTEND'), []);
  assert.deepEqual(prop(ics, 'LOCATION'), []);
  assert.deepEqual(prop(ics, 'STATUS'), ['CANCELLED']);
  assert.deepEqual(prop(ics, 'X-WR-CALNAME'), []);
  const empty = buildCalendar([], { uidDomain: 'x', now: NOW });
  assert.equal(vevents(empty), 0);
  assert.ok(empty.endsWith('CALSCALE:GREGORIAN\r\nEND:VCALENDAR\r\n'));
});

await check('file names are ASCII slugs', () => {
  assert.equal(icsFilename('Dọn rác, bãi biển Đà Nẵng!'), 'don-rac-bai-bien-da-nang.ics');
  assert.equal(icsFilename('🌊🌊'), 'event.ics');
});

// --- fixtures ---------------------------------------------------------------

const mkUser = async (n: string, role: UserRole, extra: Partial<typeof users.$inferInsert> = {}) => {
  const [row] = await db.insert(users).values({
    username: `zz_${n}_${stamp}`, email: `zz_${n}_${stamp}@test.local`, passwordHash: await hashPassword('Passw0rdLong1'),
    name: n, birthdate: new Date('1990-01-01'), role, isVerified: true, ...extra,
  }).returning();
  return { ...row!, token: createAccessToken({ id: row!.id, email: row!.email, role }) };
};
const HOUR = 36e5;
const mkEvent = async (title: string, startAt: Date, extra: Partial<typeof events.$inferInsert> = {}) => {
  const [row] = await db.insert(events).values({
    title: `zz_${title}_${stamp}`, location: 'Hanoi', startAt, endAt: new Date(startAt.getTime() + 2 * HOUR),
    managerId: mgr.id, status: 'approved', ...extra,
  }).returning();
  return row!;
};
const mkReg = async (eventId: string, volunteerId: string, status: 'pending' | 'approved' = 'approved') => {
  const [row] = await db.insert(registrations).values({ eventId, volunteerId, status }).returning();
  return row!;
};

const mgr = await mkUser('mgr', UserRole.Manager);
const vol = await mkUser('vol', UserRole.Volunteer);
const pendingVol = await mkUser('pendingvol', UserRole.Volunteer);
const outsider = await mkUser('outsider', UserRole.Volunteer);

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;
const get = async (path: string, token?: string) => {
  const res = await fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: res.status, headers: res.headers, text: await res.text() };
};

// --- the .ics routes ----------------------------------------------------------

const now = Date.now();
const soon = await mkEvent('soon', new Date(now + 3 * 24 * HOUR), { description: 'Line one\nLine two, with comma' });
const later = await mkEvent('later', new Date(now + 10 * 24 * HOUR), { endAt: null });
const running = await mkEvent('running', new Date(now - HOUR), { endAt: new Date(now + HOUR) });
const over = await mkEvent('over', new Date(now - 3 * 24 * HOUR));
const cancelled = await mkEvent('cancelled', new Date(now + 5 * 24 * HOUR), { status: 'cancelled' });
const finished = await mkEvent('finished', new Date(now + 6 * 24 * HOUR), { status: 'finished' });
for (const e of [soon, later, running, over, cancelled, finished]) await mkReg(e.id, vol.id);
await mkReg(soon.id, pendingVol.id, 'pending');
const pendingOnly = await mkEvent('pendingonly', new Date(now + 4 * 24 * HOUR));
await mkReg(pendingOnly.id, vol.id, 'pending');

await check('one event downloads as an attachment for an approved volunteer', async () => {
  const res = await get(`/api/events/${soon.id}/calendar.ics`, vol.token);
  assert.equal(res.status, 200, res.text);
  assert.equal(res.headers.get('content-type'), 'text/calendar; charset=utf-8');
  assert.equal(res.headers.get('content-disposition'), `attachment; filename="zz-soon-${stamp}.ics"`);
  assert.match(res.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(vevents(res.text), 1);
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  assert.deepEqual(prop(res.text, 'URL'), [`${frontend}/events/${soon.id}`]);
  assert.deepEqual(prop(res.text, 'UID'), [`event-${soon.id}@${new URL(frontend).hostname}`]);
  assert.deepEqual(prop(res.text, 'DTSTART'), [formatUtc(soon.startAt)]);
  assert.deepEqual(prop(res.text, 'SUMMARY'), [`zz_soon_${stamp}`]);
  assert.ok(prop(res.text, 'DESCRIPTION')[0]!.startsWith('Line one\\nLine two\\, with comma\\n\\nEvent page: '));
});

await check('one event is 401 signed out and 404 for anyone not approved for it', async () => {
  assert.equal((await get(`/api/events/${soon.id}/calendar.ics`)).status, 401);
  assert.equal((await get(`/api/events/${soon.id}/calendar.ics`, pendingVol.token)).status, 404, 'pending');
  assert.equal((await get(`/api/events/${soon.id}/calendar.ics`, outsider.token)).status, 404, 'outsider');
  assert.equal((await get(`/api/events/${soon.id}/calendar.ics`, mgr.token)).status, 404, 'manager, not registered');
  assert.equal((await get(`/api/events/${pendingOnly.id}/calendar.ics`, vol.token)).status, 404, 'own pending');
  assert.equal((await get('/api/events/00000000-0000-4000-8000-000000000000/calendar.ics', vol.token)).status, 404);
  assert.equal((await get('/api/events/not-an-id/calendar.ics', vol.token)).status, 404);
});

await check('the whole calendar holds approved events that have not ended, soonest first', async () => {
  assert.equal((await get('/api/register/me/calendar.ics')).status, 401);
  const res = await get('/api/register/me/calendar.ics', vol.token);
  assert.equal(res.status, 200, res.text);
  assert.equal(res.headers.get('content-type'), 'text/calendar; charset=utf-8');
  assert.equal(res.headers.get('content-disposition'), 'attachment; filename="volunteerhub-events.ics"');
  const titles = prop(res.text, 'SUMMARY').filter((t) => t.endsWith(`_${stamp}`));
  assert.deepEqual(titles, [`zz_running_${stamp}`, `zz_soon_${stamp}`, `zz_later_${stamp}`]);
  assert.deepEqual(prop(res.text, 'X-WR-CALNAME'), ['VolunteerHub']);
  // `later` has no end: no DTEND, so 3 starts and 2 ends.
  assert.equal(prop(res.text, 'DTSTART').length, 3);
  assert.equal(prop(res.text, 'DTEND').length, 2);
});

await check('the whole calendar is a valid empty calendar for someone with no events', async () => {
  const res = await get('/api/register/me/calendar.ics', outsider.token);
  assert.equal(res.status, 200, res.text);
  assert.equal(vevents(res.text), 0);
  assert.ok(res.text.startsWith('BEGIN:VCALENDAR\r\n') && res.text.endsWith('END:VCALENDAR\r\n'));
});

// --- reminders ------------------------------------------------------------------

// A "now" no real event comes near, so the pass only ever sees this script's fixtures.
const FAKE_NOW = new Date(Date.UTC(2400, 0, 1, 12));
const at = (hours: number) => new Date(FAKE_NOW.getTime() + hours * HOUR);
const sent: EventReminderEmail[] = [];
const record: ReminderEmailSender = async (mail) => { sent.push(mail); };
const run = (opts: { now?: Date; sendEmail?: ReminderEmailSender } = {}) =>
  sendDueReminders({ now: FAKE_NOW, sendEmail: record, ...opts });
const reminderRow = async (id: string) =>
  (await db.select().from(registrations).where(eq(registrations.id, id)))[0]!.reminderSentAt;
const remindersFor = (userId: string) => db.select().from(notifications)
  .where(and(eq(notifications.userId, userId), eq(notifications.type, 'event_reminder')));

const r1User = await mkUser('r1', UserRole.Volunteer);
const quietUser = await mkUser('quiet', UserRole.Volunteer, { notificationsEnabled: false });
const in23h = await mkEvent('r_in23h', at(23), { description: 'Bring water', location: 'Ba Vì, Hà Nội' });
const in25h = await mkEvent('r_in25h', at(25));
const started = await mkEvent('r_started', at(-1));
const pendingEvent = await mkEvent('r_pendingevent', at(10), { status: 'pending' });
const due = await mkReg(in23h.id, r1User.id);
const tooEarly = await mkReg(in25h.id, r1User.id);
const alreadyStarted = await mkReg(started.id, r1User.id);
const notApproved = await mkReg(in23h.id, pendingVol.id, 'pending');
const eventNotApproved = await mkReg(pendingEvent.id, r1User.id);
const notificationsOff = await mkReg(in23h.id, quietUser.id);

await check('a reminder goes to approved volunteers of approved events starting within 24 hours', async () => {
  const result = await run();
  assert.deepEqual(result.registrationIds, [due.id]);
  assert.equal(result.emailed, 1);
  assert.equal(result.failed, 0);
  assert.equal(sent.length, 1);
  const [mail] = sent;
  assert.equal(mail!.to, r1User.email);
  assert.equal(mail!.greeting, 'r1');
  assert.equal(mail!.eventTitle, in23h.title);
  assert.equal(mail!.location, 'Ba Vì, Hà Nội');
  // 11:00 UTC is 18:00 in Vietnam, the default zone. ICU versions differ on the comma after the weekday.
  assert.match(mail!.when, /^on Sunday,? 2 January 2400 at 18:00 GMT\+7$/, mail!.when);
  assert.ok(mail!.url.endsWith(`/events/${in23h.id}`));
  assert.equal(mail!.icsFilename, `zz-r-in23h-${stamp}.ics`);
  assert.deepEqual(prop(mail!.ics, 'DTSTART'), [formatUtc(in23h.startAt)]);

  assert.deepEqual(await reminderRow(due.id), FAKE_NOW, 'the claim is recorded');
  for (const r of [tooEarly, alreadyStarted, notApproved, eventNotApproved, notificationsOff]) {
    assert.equal(await reminderRow(r.id), null, `registration ${r.id} should be left alone`);
  }

  const inbox = await remindersFor(r1User.id);
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0]!.title, 'Event Reminder');
  assert.equal(inbox[0]!.body, `Event ${in23h.title} starts within 24 hours`);
  assert.deepEqual(inbox[0]!.data, {
    eventId: in23h.id, eventTitle: in23h.title, startAt: in23h.startAt.toISOString(), url: `/events/${in23h.id}`,
  });
  assert.equal((await remindersFor(quietUser.id)).length, 0);
});

await check('running again sends nothing twice', async () => {
  sent.length = 0;
  const again = await run({ now: new Date(FAKE_NOW.getTime() + 15 * 60e3) });
  assert.deepEqual(again.registrationIds, []);
  assert.equal(sent.length, 0);
  assert.equal((await remindersFor(r1User.id)).length, 1);
});

await check('the 25-hour event is reminded once it comes within 24 hours', async () => {
  sent.length = 0;
  const later2h = await run({ now: at(2) });
  assert.deepEqual(later2h.registrationIds, [tooEarly.id]);
  assert.deepEqual(sent.map((m) => m.eventTitle), [in25h.title]);
});

await check('concurrent runs remind each volunteer exactly once', async () => {
  const crowd = await Promise.all([0, 1, 2, 3, 4].map((i) => mkUser(`crowd${i}`, UserRole.Volunteer)));
  const busy = await mkEvent('r_busy', at(5));
  const regs = await Promise.all(crowd.map((u) => mkReg(busy.id, u.id)));
  sent.length = 0;
  const runs = await Promise.all([run(), run(), run(), run()]);
  const claimed = runs.flatMap((r) => r.registrationIds);
  assert.deepEqual([...claimed].sort(), regs.map((r) => r.id).sort(), 'every registration claimed exactly once');
  assert.equal(sent.length, crowd.length);
  assert.equal(new Set(sent.map((m) => m.to)).size, crowd.length);
  const inbox = await db.select().from(notifications).where(and(
    inArray(notifications.userId, crowd.map((u) => u.id)), eq(notifications.type, 'event_reminder')));
  assert.equal(inbox.length, crowd.length);
});

await check('a failed email is counted, and the reminder is not retried', async () => {
  const unlucky = await mkUser('unlucky', UserRole.Volunteer);
  const ev = await mkEvent('r_unlucky', at(3));
  const reg = await mkReg(ev.id, unlucky.id);
  const failing = await run({ sendEmail: async () => { throw new Error('smtp down'); } });
  assert.deepEqual(failing.registrationIds, [reg.id]);
  assert.equal(failing.failed, 1);
  assert.equal(failing.emailed, 0);
  assert.equal((await remindersFor(unlucky.id)).length, 1, 'the in-app reminder still arrives');
  sent.length = 0;
  assert.deepEqual((await run()).registrationIds, []);
  assert.equal(sent.length, 0);
});

await check('moving the start time re-arms the reminder', async () => {
  const moved = await mkEvent('r_moved', at(-48));
  const reg = await mkReg(moved.id, r1User.id);
  await db.update(registrations).set({ reminderSentAt: at(-72) }).where(eq(registrations.id, reg.id));
  const res = await fetch(`${base}/api/events/${moved.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgr.token}` },
    body: JSON.stringify({ startAt: at(6).toISOString(), endAt: at(8).toISOString() }),
  });
  assert.equal(res.status, 200, await res.text());
  assert.equal(await reminderRow(reg.id), null, 'cleared by the reschedule');
  sent.length = 0;
  assert.deepEqual((await run()).registrationIds, [reg.id]);

  // An edit that keeps the start time keeps the claim.
  const edit = await fetch(`${base}/api/events/${moved.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mgr.token}` },
    body: JSON.stringify({ title: `zz_r_moved2_${stamp}` }),
  });
  assert.equal(edit.status, 200);
  assert.deepEqual(await reminderRow(reg.id), FAKE_NOW);
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'CALENDAR CHECK FAILED' : 'CALENDAR CHECK PASSED');

// Events, registrations and notifications go with their managers and volunteers.
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
await closeDb();
process.exit();
