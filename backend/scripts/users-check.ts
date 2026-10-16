/**
 * Exercises users and auth end to end against a real PostgreSQL: sign-up, OTP
 * verification, login, profile, bans on live tokens, admin management, Google
 * sign-in and env-driven admin seeding. Same shape as authz-check: boot the
 * exported app on an ephemeral port and assert on HTTP responses.
 *
 * Needs a migrated PostgreSQL (DATABASE_URL). Run with: npm run check:users
 * Test accounts are prefixed zz_ and removed afterwards.
 */
import assert from 'node:assert/strict';
import 'dotenv/config';
import { eq, like } from 'drizzle-orm';
import app from '../app.ts';
import { db } from '../db/client.ts';
import { pushSubscriptions, users } from '../db/schema.ts';
import { findOrCreateByGoogleId, seedAdminUser } from '../services/user.service.ts';
import { hashPassword } from '../utils/password.util.ts';
import { createAccessToken, generateAuthToken } from '../utils/jwt.util.ts';
import { UserRole } from '../types/user.ts';

const stamp = Date.now();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

const json = { 'Content-Type': 'application/json' };
// The rate limiter keys on CF-Connecting-IP. Rate limiting is covered by
// smoke:security; here every request gets its own caller so it never interferes.
let caller = 0;
const call = async (method: string, path: string, body?: unknown, token?: string) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...json, 'CF-Connecting-IP': `10.0.${caller >> 8}.${caller++ & 255}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

// OTPs only ever travel by email, so the one thing read behind the API is the code.
const otpFor = async (email: string) => {
  const [row] = await db.select({ otp: users.otp }).from(users).where(eq(users.email, email));
  assert.ok(row?.otp, 'no OTP stored');
  return row.otp;
};

const PASSWORD = 'Passw0rdLong1';
const mail = (n: string) => `zz_${n}_${stamp}@test.local`;
const uname = (n: string) => `zz_${n}_${stamp}`;

const mkUser = async (n: string, role: 'volunteer' | 'manager' | 'admin', password = PASSWORD) => {
  const [row] = await db.insert(users).values({
    username: uname(n), email: mail(n), passwordHash: await hashPassword(password), name: n,
    birthdate: new Date('1990-01-01'), role, isVerified: true,
  }).returning();
  const token = createAccessToken({ id: row!.id, email: row!.email, role: role as UserRole });
  return { id: row!.id, token };
};
const rowOf = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];

// --- sign-up, verification, login ----------------------------------------

await check('DISABLE_EMAIL_OTP signs up verified, with no code to enter', async () => {
  process.env.DISABLE_EMAIL_OTP = 'true';
  try {
    const reg = await call('POST', '/api/auth/register', {
      username: uname('nootp'), email: mail('nootp'), password: PASSWORD, birthdate: '1995-05-05T00:00:00.000Z',
    });
    assert.equal(reg.status, 201, JSON.stringify(reg.data));
    assert.equal(reg.data.data.user.isVerified, true);
  } finally {
    delete process.env.DISABLE_EMAIL_OTP;
  }
  const login = await call('POST', '/api/auth/login', { email: mail('nootp'), password: PASSWORD });
  assert.equal(login.status, 200, JSON.stringify(login.data));
});

await check('register, verify OTP, log in and read /auth/me', async () => {
  const reg = await call('POST', '/api/auth/register', {
    username: uname('alice'), email: mail('alice'), password: PASSWORD,
    name: 'Alice', birthdate: '1995-05-05T00:00:00.000Z',
  });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  assert.equal(reg.data.data.user.email, mail('alice'));
  assert.equal(reg.data.data.user.role, 'volunteer');

  const early = await call('POST', '/api/auth/login', { email: mail('alice'), password: PASSWORD });
  assert.equal(early.status, 403, 'unverified account must not log in');

  const wrong = await call('POST', '/api/auth/verify-otp', { email: mail('alice'), otp: '000000' });
  assert.equal(wrong.status, 401);

  const ver = await call('POST', '/api/auth/verify-otp', { email: mail('alice'), otp: await otpFor(mail('alice')) });
  assert.equal(ver.status, 200, JSON.stringify(ver.data));

  const login = await call('POST', '/api/auth/login', { email: mail('alice'), password: PASSWORD });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.user.name, 'Alice');

  const byName = await call('POST', '/api/auth/login', { username: uname('alice'), password: PASSWORD });
  assert.equal(byName.status, 200, 'login by username');

  const bad = await call('POST', '/api/auth/login', { email: mail('alice'), password: 'WrongPassword1' });
  assert.equal(bad.status, 401);

  const me = await call('GET', '/api/auth/me', undefined, login.data.accessToken);
  assert.equal(me.status, 200, JSON.stringify(me.data));
  assert.equal(me.data.user.id, login.data.user.id);
  assert.equal(me.data.user.birthdate, '1995-05-05');
  assert.equal(me.data.user.authProvider, 'local');
  assert.equal(me.data.user.isBanned, false);

  const dup = await call('POST', '/api/auth/register', {
    username: uname('alice'), email: mail('other'), password: PASSWORD, birthdate: '1995-05-05T00:00:00.000Z',
  });
  assert.equal(dup.status, 409, 'duplicate username');
});

// --- env-driven admin seeding -------------------------------------------

await check('admin seeding creates one admin from env, only when none exists', async () => {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  if (existing) {
    out.push('  SKIP  admin seeding: this database already has an admin');
    return;
  }
  process.env.SEED_ADMIN_EMAIL = mail('seed');
  process.env.SEED_ADMIN_PASSWORD = 'SeededAdminPw1';
  await seedAdminUser();
  const login = await call('POST', '/api/auth/login', { email: mail('seed'), password: 'SeededAdminPw1' });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.user.role, 'admin');

  process.env.SEED_ADMIN_EMAIL = mail('seed2');
  await seedAdminUser();
  assert.equal((await db.select().from(users).where(eq(users.email, mail('seed2')))).length, 0, 'a second admin was seeded');
  delete process.env.SEED_ADMIN_EMAIL;
  delete process.env.SEED_ADMIN_PASSWORD;
});

// --- vertical: a volunteer against the admin routes ---------------------

const admin = await mkUser('admin', 'admin', 'OriginalAdminPw1');
const vol = await mkUser('vol', 'volunteer');

await check('volunteer cannot promote itself to admin', async () => {
  const res = await call('PUT', `/api/users/admin/${vol.id}`, { role: 'admin' }, vol.token);
  assert.equal(res.status, 403);
  assert.equal((await rowOf(vol.id))?.role, 'volunteer', 'role changed in the database');
});

await check("volunteer cannot reset an admin's password", async () => {
  const res = await call('PUT', `/api/users/admin/${admin.id}`, { password: 'HackedPassword1' }, vol.token);
  assert.equal(res.status, 403);
  const login = await call('POST', '/api/auth/login', { email: mail('admin'), password: 'OriginalAdminPw1' });
  assert.equal(login.status, 200, 'original password broken');
});

await check('volunteer cannot delete or mint accounts', async () => {
  assert.equal((await call('DELETE', `/api/users/admin/${admin.id}`, undefined, vol.token)).status, 403);
  assert.ok(await rowOf(admin.id), 'admin was deleted');
  const mint = await call('POST', '/api/users/admin/create', {
    username: uname('new'), email: mail('new'), password: 'NewAdminPw1234', role: 'admin',
  }, vol.token);
  assert.equal(mint.status, 403);
});

// --- bans apply to tokens issued before the ban -------------------------

await check('ban takes effect on a live token, and unban restores it', async () => {
  assert.equal((await call('GET', '/api/auth/me', undefined, vol.token)).status, 200);

  const ban = await call('POST', `/api/users/admin/ban/${vol.id}`, { reason: 'spam' }, admin.token);
  assert.equal(ban.status, 200, JSON.stringify(ban.data));

  const res = await call('GET', '/api/notifications', undefined, vol.token);
  assert.equal(res.status, 403, 'existing token still worked after the ban');
  assert.match(res.data.message, /spam/);
  const login = await call('POST', '/api/auth/login', { email: mail('vol'), password: PASSWORD });
  assert.equal(login.status, 403, 'banned user logged in');

  const banned = await call('GET', '/api/users/admin/banned', undefined, admin.token);
  assert.ok(banned.data.data.some((u: any) => u._id === vol.id && u.bannedReason === 'spam'));

  assert.equal((await call('POST', `/api/users/admin/unban/${vol.id}`, undefined, admin.token)).status, 200);
  assert.equal((await call('GET', '/api/auth/me', undefined, vol.token)).status, 200, 'unban did not restore access');
  assert.equal((await rowOf(vol.id))?.bannedReason, null);
});

await check('a dated ban blocks until its date passes', async () => {
  await db.update(users).set({ bannedUntil: new Date(Date.now() + 60_000) }).where(eq(users.id, vol.id));
  assert.equal((await call('GET', '/api/auth/me', undefined, vol.token)).status, 403, 'future bannedUntil should block');
  await db.update(users).set({ bannedUntil: new Date(Date.now() - 60_000) }).where(eq(users.id, vol.id));
  assert.equal((await call('GET', '/api/auth/me', undefined, vol.token)).status, 200, 'past bannedUntil should not block');
});

// --- admin user management ---------------------------------------------

await check('admin can create, search, update and delete users', async () => {
  const created = await call('POST', '/api/users/admin/create', {
    username: uname('made'), email: mail('made'), password: 'MadeByAdmin1', name: 'Made', role: 'manager',
  }, admin.token);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const id = created.data.data._id;
  assert.ok(id);
  assert.equal(created.data.data.role, 'manager');
  assert.equal(created.data.data.passwordHash, undefined, 'hash leaked in the response');

  const dup = await call('POST', '/api/users/admin/create', {
    username: uname('made'), email: mail('dup'), password: 'MadeByAdmin1',
  }, admin.token);
  assert.equal(dup.status, 400);

  assert.equal((await call('POST', '/api/auth/login', { email: mail('made'), password: 'MadeByAdmin1' })).status, 200);

  const search = await call('GET', `/api/users/admin/search?q=${encodeURIComponent('zz_made_')}&role=manager&status=active&sortBy=username&sortOrder=asc&limit=5`, undefined, admin.token);
  assert.equal(search.status, 200, JSON.stringify(search.data));
  assert.equal(search.data.data.length, 1);
  assert.equal(search.data.data[0]._id, id);
  assert.equal(search.data.data[0].email, mail('made'));
  assert.deepEqual(search.data.meta, { total: 1, page: 1, totalPages: 1 });

  // Role sorts alphabetically (admin, manager, volunteer), not by enum declaration order.
  const byRole = await call('GET', `/api/users/admin/search?q=${encodeURIComponent('zz_')}&sortBy=role&sortOrder=asc&limit=50`, undefined, admin.token);
  const roles: string[] = byRole.data.data.map((u: { role: string }) => u.role);
  assert.ok(roles.includes('admin') && roles.includes('manager'), 'fixtures missing from the role sort');
  assert.deepEqual(roles, [...roles].sort());
  assert.deepEqual(created.data.data.friends, [], 'friends key dropped from user responses');

  const wild = await call('GET', `/api/users/admin/search?q=${encodeURIComponent('%')}`, undefined, admin.token);
  assert.equal(wild.data.meta.total, 0, '% must be a literal, not a wildcard');

  const upd = await call('PUT', `/api/users/admin/${id}`, { role: 'volunteer', name: 'Renamed', password: 'ChangedByAdmin1' }, admin.token);
  assert.equal(upd.status, 200, JSON.stringify(upd.data));
  assert.equal(upd.data.data.role, 'volunteer');
  assert.equal((await call('POST', '/api/auth/login', { email: mail('made'), password: 'ChangedByAdmin1' })).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { email: mail('made'), password: 'MadeByAdmin1' })).status, 401);

  const clash = await call('PUT', `/api/users/admin/${id}`, { username: uname('admin') }, admin.token);
  assert.equal(clash.status, 400);

  assert.equal((await call('DELETE', `/api/users/admin/${id}`, undefined, admin.token)).status, 200);
  assert.equal((await call('DELETE', `/api/users/admin/${id}`, undefined, admin.token)).status, 404);
  assert.equal((await call('DELETE', '/api/users/admin/not-an-id', undefined, admin.token)).status, 404);
});

// --- profiles ------------------------------------------------------------

await check('profile edit: fields, password change and username clash', async () => {
  const me = await mkUser('prof', 'volunteer');
  const other = await mkUser('other', 'volunteer');

  const edit = await call('PATCH', '/api/users/profile/secure', {
    name: 'Pat', birthdate: '1999-09-09', notifyOnMention: false, profilePicture: 'https://example.com/a.png',
  }, me.token);
  assert.equal(edit.status, 200, JSON.stringify(edit.data));
  assert.equal(edit.data.user.name, 'Pat');
  assert.equal(edit.data.user.notifyOnMention, false);
  assert.equal(edit.data.user.profilePicture, 'https://example.com/a.png');
  assert.equal(edit.data.user._id, me.id);
  assert.equal(edit.data.user.passwordHash, undefined);
  assert.equal(edit.data.user.authProvider, undefined, 'authProvider is not part of this response');

  const cleared = await call('PATCH', '/api/users/profile/secure', { profilePicture: '' }, me.token);
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data.user.profilePicture, undefined);

  assert.equal((await call('PATCH', '/api/users/profile/secure', {}, me.token)).status, 400, 'empty update');
  const taken = await call('PATCH', '/api/users/profile/secure', { username: uname('other') }, me.token);
  assert.equal(taken.status, 400);
  assert.match(taken.data.message, /already taken/);

  const noCurrent = await call('PATCH', '/api/users/profile/secure', { password: 'BrandNewPass1' }, me.token);
  assert.equal(noCurrent.status, 400);
  const wrong = await call('PATCH', '/api/users/profile/secure', { password: 'BrandNewPass1', currentPassword: 'nope-nope' }, me.token);
  assert.equal(wrong.status, 401);
  const ok = await call('PATCH', '/api/users/profile/secure', { password: 'BrandNewPass1', currentPassword: PASSWORD }, me.token);
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal((await call('POST', '/api/auth/login', { email: mail('prof'), password: 'BrandNewPass1' })).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { email: mail('prof'), password: PASSWORD })).status, 401);
  void other;
});

await check('forgotten password: OTP, verify, reset, and reuse is refused', async () => {
  await mkUser('forgot', 'volunteer');
  assert.equal((await call('POST', '/api/auth/forgot-password', { email: mail('forgot') })).status, 200);
  assert.equal((await call('POST', '/api/auth/forgot-password', { email: mail('nobody') })).status, 200, 'must not reveal unknown emails');

  const otp = await otpFor(mail('forgot'));
  assert.equal((await call('POST', '/api/auth/verify-reset-otp', { email: mail('forgot'), otp: '000000' })).status, 401);
  assert.equal((await call('POST', '/api/auth/verify-reset-otp', { email: mail('forgot'), otp })).status, 200);

  const reset = await call('POST', '/api/auth/reset-password', { email: mail('forgot'), otp, password: 'ResetPassw0rd1' });
  assert.equal(reset.status, 200, JSON.stringify(reset.data));
  assert.equal((await call('POST', '/api/auth/login', { email: mail('forgot'), password: 'ResetPassw0rd1' })).status, 200);

  const again = await call('POST', '/api/auth/reset-password', { email: mail('forgot'), otp, password: 'AnotherPassw0rd1' });
  assert.ok(again.status >= 400, 'an OTP must work only once');

  await call('POST', '/api/auth/forgot-password', { email: mail('forgot') });
  await db.update(users).set({ otpExpiresAt: new Date(Date.now() - 1000) }).where(eq(users.email, mail('forgot')));
  const stale = await call('POST', '/api/auth/verify-reset-otp', { email: mail('forgot'), otp: await otpFor(mail('forgot')) });
  assert.equal(stale.status, 400, 'expired OTP');
});

await check('public profile, search and admin-profile protection', async () => {
  const pub = await call('GET', `/api/users/${uname('prof')}`);
  assert.equal(pub.status, 200, JSON.stringify(pub.data));
  assert.equal(pub.data.user.username, uname('prof'));
  assert.equal(pub.data.user.birthdate, '1999-09-09');
  assert.equal(pub.data.user.email, undefined, 'email must stay private');
  assert.equal(pub.data.user.profilePicture, null);

  assert.equal((await call('GET', '/api/users/zz_nobody_here')).status, 404);
  for (const sub of ['stats', 'events', 'friends']) {
    assert.equal((await call('GET', `/api/users/${uname('admin')}/${sub}`)).status, 403, `admin ${sub}`);
  }

  const found = await call('GET', `/api/users/search/query?q=${encodeURIComponent(`zz_prof_${stamp}`)}`);
  assert.equal(found.status, 200);
  assert.equal(found.data.data.length, 1);
  assert.equal(found.data.data[0].username, uname('prof'));
  assert.equal(found.data.data[0].email, undefined);

  await db.update(users).set({ isActive: false }).where(eq(users.username, uname('prof')));
  assert.equal((await call('GET', `/api/users/${uname('prof')}`)).status, 404, 'deactivated profile');
  assert.equal((await call('GET', `/api/users/search/query?q=${encodeURIComponent(`zz_prof_${stamp}`)}`)).data.data.length, 0);
});

// --- Google sign-in and push subscriptions -------------------------------
// The OAuth redirect needs Google, so the service behind the passport callback
// is called directly.

await check('Google sign-in finds or creates an account, which has no password', async () => {
  const profile = { email: mail('goog'), name: 'Gee', googleId: `g_${stamp}` };
  const first = await findOrCreateByGoogleId(profile);
  assert.equal(first.authProvider, 'google');
  assert.equal(first.isVerified, true);
  assert.equal(first.username, `zz_goog_${stamp}`);

  const again = await findOrCreateByGoogleId(profile);
  assert.equal(again._id, first._id, 'second sign-in must not create another account');

  const sameEmail = await findOrCreateByGoogleId({ ...profile, googleId: `g2_${stamp}` });
  assert.equal(sameEmail._id, first._id, 'matched by email');

  const clash = await findOrCreateByGoogleId({ email: `zz_goog_${stamp}@elsewhere.test`, name: 'Other', googleId: `g3_${stamp}` });
  assert.notEqual(clash._id, first._id);
  assert.match(clash.username, new RegExp(`^zz_goog_${stamp}\\d{3}$`), 'username collision gets a suffix');

  assert.equal((await call('POST', '/api/auth/login', { email: mail('goog'), password: 'anything-at-all' })).status, 401);

  const me = await call('GET', '/api/auth/me', undefined, generateAuthToken(first));
  assert.equal(me.status, 200, JSON.stringify(me.data));
  assert.equal(me.data.user.authProvider, 'google');
});

await check('push subscriptions go with their user', async () => {
  const u = await mkUser('push', 'volunteer');
  await db.insert(pushSubscriptions).values({ userId: u.id, endpoint: 'https://127.0.0.1:9/none', p256dh: 'k', auth: 'a' });

  await db.delete(users).where(eq(users.id, u.id));
  const left = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, u.id));
  assert.equal(left.length, 0, 'subscription outlived its user');
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'USERS CHECK FAILED' : 'USERS CHECK PASSED');

await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
process.exit(process.exitCode ?? 0);
