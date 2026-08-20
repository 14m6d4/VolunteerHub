/**
 * Proves the authorization fixes hold end to end against a real database.
 *
 * Two families of case:
 *   - vertical:   a volunteer must not reach the admin routes, and a ban must
 *                 take effect on a token issued before the ban.
 *   - horizontal: a manager must not act on another manager's event. Passing
 *                 roleMiddleware only proves the caller is *a* manager.
 *
 * Needs a running MongoDB. Run with: npm run check:authz
 * Test accounts and events are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import 'dotenv/config';
import app from '../app.ts';
import User from '../models/User.model.ts';
import { EventModel, EventStatus } from '../models/Event.model.ts';
import { RegistrationModel, RegistrationStatus } from '../models/Registration.model.ts';
import { UserRole } from '../types/user.ts';
import { createAccessToken } from '../utils/jwt.util.ts';

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGO_URI as string);

const stamp = Date.now();
const mkUser = (n: string, role: UserRole, password = 'Passw0rdLong1') => User.create({
  username: `zz_${n}_${stamp}`,
  email: `zz_${n}_${stamp}@test.local`,
  passwordHash: password,
  name: n,
  birthdate: new Date('1990-01-01'),
  role,
  isVerified: true,
  isActive: true,
  authProvider: 'local',
});

const victimAdmin = await mkUser('admin', UserRole.Admin, 'OriginalAdminPw1');
const attacker = await mkUser('vol', UserRole.Volunteer);
const victimMgr = await mkUser('victimmgr', UserRole.Manager);
const evilMgr = await mkUser('evilmgr', UserRole.Manager);

const victimEvent = await EventModel.create({
  title: 'Victim Event',
  description: 'd',
  location: 'l',
  startAt: new Date(Date.now() + 864e5),
  endAt: new Date(Date.now() + 9e7),
  managerId: victimMgr._id,
  status: EventStatus.PENDING,
  isPublic: true,
});
const victimReg = await RegistrationModel.create({
  eventId: victimEvent._id,
  volunteerId: attacker._id,
  status: RegistrationStatus.PENDING,
});

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

const auth = (u: any) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${createAccessToken({ id: u._id.toString(), email: u.email, role: u.role })}`,
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
  const res = await fetch(`${base}/api/users/admin/${attacker._id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ role: 'admin' }),
  });
  assert.equal(res.status, 403);
  const after = await User.findById(attacker._id);
  assert.ok(after);
  assert.equal(after.role, UserRole.Volunteer, 'role changed in the database');
});

await check("volunteer cannot reset an admin's password", async () => {
  const res = await fetch(`${base}/api/users/admin/${victimAdmin._id}`, {
    method: 'PUT', headers: H, body: JSON.stringify({ password: 'HackedPassword1' }),
  });
  assert.equal(res.status, 403);
  const after = await User.findById(victimAdmin._id).select('+passwordHash');
  assert.ok(after);
  assert.equal(await after.comparePassword('HackedPassword1'), false, 'password was changed');
  assert.equal(await after.comparePassword('OriginalAdminPw1'), true, 'original password broken');
});

await check('volunteer cannot delete another account', async () => {
  const res = await fetch(`${base}/api/users/admin/${victimAdmin._id}`, { method: 'DELETE', headers: H });
  assert.equal(res.status, 403);
  assert.ok(await User.findById(victimAdmin._id), 'admin was deleted');
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
  assert.equal(await User.findOne({ username: `zz_new_${stamp}` }), null, 'account was created');
});

// --- horizontal: manager against another manager's event -----------------

await check("manager cannot edit another manager's event", async () => {
  const res = await fetch(`${base}/api/events/${victimEvent._id}`, {
    method: 'PUT', headers: EH, body: JSON.stringify({ title: 'HIJACKED' }),
  });
  assert.equal(res.status, 403);
  const after = await EventModel.findById(victimEvent._id);
  assert.ok(after);
  assert.equal(after.title, 'Victim Event', 'title was changed');
});

await check('manager cannot approve an event via PUT', async () => {
  const res = await fetch(`${base}/api/events/${victimEvent._id}`, {
    method: 'PUT', headers: EH, body: JSON.stringify({ status: 'approved' }),
  });
  assert.ok(res.status >= 400, `expected a rejection, got ${res.status}`);
  const after = await EventModel.findById(victimEvent._id);
  assert.ok(after);
  assert.equal(after.status, EventStatus.PENDING, 'event was approved without an admin');
});

await check("manager cannot moderate registrations on another's event", async () => {
  const res = await fetch(`${base}/api/register/${victimReg._id}/approve`, { method: 'POST', headers: EH });
  assert.equal(res.status, 403);
  const after = await RegistrationModel.findById(victimReg._id);
  assert.ok(after);
  assert.equal(after.status, RegistrationStatus.PENDING, 'registration was approved');
});

await check("manager cannot delete another manager's event", async () => {
  const res = await fetch(`${base}/api/events/${victimEvent._id}`, { method: 'DELETE', headers: EH });
  assert.equal(res.status, 403);
  assert.ok(await EventModel.findById(victimEvent._id), 'event was deleted');
});

await check('member list does not leak emails to non-organisers', async () => {
  // The roster must actually contain an approved member, otherwise an empty
  // list would pass this check without proving anything.
  await RegistrationModel.findByIdAndUpdate(victimReg._id, { status: RegistrationStatus.APPROVED });
  const res = await fetch(`${base}/api/register/${victimEvent._id}`, { headers: H });
  const body = await res.text();
  assert.ok(body.includes(`zz_vol_${stamp}`), 'the approved member should still be listed');
  assert.ok(!body.includes('@test.local'), 'an email address was exposed');
  await RegistrationModel.findByIdAndUpdate(victimReg._id, { status: RegistrationStatus.PENDING });
});

// --- bans apply to tokens issued before the ban --------------------------

await check('banned user is rejected mid-session', async () => {
  const ok = await fetch(`${base}/api/auth/me`, { headers: H });
  assert.equal(ok.status, 200, 'valid token should work before the ban');
  await User.findByIdAndUpdate(attacker._id, { isBanned: true, bannedReason: 'test' });
  const res = await fetch(`${base}/api/notifications`, { headers: H });
  assert.equal(res.status, 403, 'existing token still worked after the ban');
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'AUTHZ CHECK FAILED' : 'AUTHZ CHECK PASSED');

await RegistrationModel.deleteMany({ eventId: victimEvent._id });
await EventModel.deleteMany({ managerId: { $in: [victimMgr._id, evilMgr._id] } });
await User.deleteMany({ username: { $regex: `^zz_.*_${stamp}$` } });
server.close();
await mongoose.disconnect();
