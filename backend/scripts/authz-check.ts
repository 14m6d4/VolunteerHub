/**
 * Proves the authorization fixes hold end to end against a real database:
 * a volunteer must not be able to reach the admin routes, and a ban must take
 * effect on a token that was issued before it.
 *
 * Needs a running MongoDB. Run with: npm run check:authz
 * Test accounts are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import 'dotenv/config';
import app from '../app.ts';
import User from '../models/User.model.ts';
import { createAccessToken } from '../utils/jwt.util.ts';

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGO_URI as string);

const stamp = Date.now();
const victimAdmin = await User.create({
  username: `zz_admin_${stamp}`, email: `zz_admin_${stamp}@test.local`,
  passwordHash: 'OriginalAdminPw1', name: 'Victim Admin',
  birthdate: new Date('1990-01-01'), role: 'admin', isVerified: true, isActive: true, authProvider: 'local',
});
const attacker = await User.create({
  username: `zz_vol_${stamp}`, email: `zz_vol_${stamp}@test.local`,
  passwordHash: 'AttackerPw12345', name: 'Attacker',
  birthdate: new Date('1990-01-01'), role: 'volunteer', isVerified: true, isActive: true, authProvider: 'local',
});

const token = createAccessToken({ id: attacker._id.toString(), email: attacker.email, role: attacker.role });
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const out: string[] = [];
const check = async (name: string, fn: () => Promise<void>) => {
  try { await fn(); out.push(`  PASS  ${name}`); }
  catch (e) { out.push(`  FAIL  ${name}: ${(e as Error).message}`); process.exitCode = 1; }
};

await check('volunteer cannot promote itself to admin', async () => {
  const res = await fetch(`${base}/api/users/admin/${attacker._id}`, { method: 'PUT', headers: H, body: JSON.stringify({ role: 'admin' }) });
  assert.equal(res.status, 403);
  const after = await User.findById(attacker._id);
  assert.ok(after);
  assert.equal(after.role, 'volunteer', 'role changed in the database');
});

await check("volunteer cannot reset an admin's password", async () => {
  const res = await fetch(`${base}/api/users/admin/${victimAdmin._id}`, { method: 'PUT', headers: H, body: JSON.stringify({ password: 'HackedPassword1' }) });
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
  const res = await fetch(`${base}/api/users/admin/create`, { method: 'POST', headers: H, body: JSON.stringify({ username: `zz_new_${stamp}`, email: `zz_new_${stamp}@test.local`, password: 'NewAdminPw1234', name: 'New', role: 'admin' }) });
  assert.equal(res.status, 403);
  assert.equal(await User.findOne({ username: `zz_new_${stamp}` }), null, 'account was created');
});

await check('banned user is rejected mid-session', async () => {
  const ok = await fetch(`${base}/api/auth/me`, { headers: H });
  assert.equal(ok.status, 200, 'valid token should work before the ban');
  await User.findByIdAndUpdate(attacker._id, { isBanned: true, bannedReason: 'test' });
  const res = await fetch(`${base}/api/notifications`, { headers: H });
  assert.equal(res.status, 403, 'existing token still worked after the ban');
});

console.log(out.join('\n'));
console.log(process.exitCode ? '\nESCALATION TEST FAILED' : '\nESCALATION TEST PASSED');
await User.deleteMany({ username: { $regex: `^zz_.*_${stamp}$` } });
server.close(); await mongoose.disconnect();
