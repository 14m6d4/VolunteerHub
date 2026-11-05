/**
 * Boots the Express app on an ephemeral port and asserts the security
 * middleware actually applies. Most cases are rejected by middleware, but the
 * login attempts that run up the rate limit reach the handler first, and the
 * token, OTP and validation cases further down use accounts of their own
 * (prefixed zz_, removed afterwards). So it needs a migrated PostgreSQL
 * (DATABASE_URL).
 *
 * Run with: npm run smoke:security
 */
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { like } from 'drizzle-orm';
import app from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import { users } from '../db/schema.ts';
import { UserRole } from '../types/user.ts';
import { createAccessToken, createRefreshToken } from '../utils/jwt.util.ts';
import { hashPassword } from '../utils/password.util.ts';

const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

const results: string[] = [];
const check = async (name: string, fn: () => Promise<void>) => {
    try {
        await fn();
        results.push(`  PASS  ${name}`);
    } catch (err) {
        results.push(`  FAIL  ${name}: ${(err as Error).message}`);
        process.exitCode = 1;
    }
};

await check('helmet sets nosniff', async () => {
    const res = await fetch(`${base}/api/events/does-not-exist`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

await check('helmet removes x-powered-by', async () => {
    const res = await fetch(`${base}/api/events/does-not-exist`);
    assert.equal(res.headers.get('x-powered-by'), null);
});

await check('CORS rejects an unknown origin', async () => {
    const res = await fetch(`${base}/api/events`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
});

await check('CORS allows the configured frontend', async () => {
    const origin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const res = await fetch(`${base}/api/events`, { headers: { Origin: origin } });
    assert.equal(res.headers.get('access-control-allow-origin'), origin);
});

await check('protected route rejects a missing token', async () => {
    const res = await fetch(`${base}/api/notifications`);
    assert.equal(res.status, 401);
});

await check('admin route rejects a missing token', async () => {
    const res = await fetch(`${base}/api/users/admin/search`);
    assert.equal(res.status, 401);
});

await check('report read rejects an anonymous caller', async () => {
    const res = await fetch(`${base}/api/report/event/123`);
    assert.equal(res.status, 401);
});

await check('report status update rejects an anonymous caller', async () => {
    const res = await fetch(`${base}/api/report/123`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
    });
    assert.equal(res.status, 401);
});

await check('notification create endpoint is gone', async () => {
    const res = await fetch(`${base}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'x', type: 'test', title: 'test' }),
    });
    assert.equal(res.status, 404);
});

await check('oversized JSON body is refused', async () => {
    const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pad: 'x'.repeat(2 * 1024 * 1024) }),
    });
    assert.equal(res.status, 413);
});

// The OTP and forgot-password routes are public, so their bodies must be
// validated before the handler sees them. The message proves the 400 came from
// validateBody: the controllers' own checks answer with different text, and a
// body that got through would reach the OTP lookup. Seven cases, under the
// otpLimiter cap of 8 these three routes share.
const malformed: Array<[string, unknown]> = [
    ['/api/auth/verify-otp', {}],
    ['/api/auth/verify-otp', { email: 'a@test.local', otp: '12ab56' }],
    ['/api/auth/verify-otp', { email: { $ne: '' }, otp: '123456' }],
    ['/api/auth/forgot-password', {}],
    ['/api/auth/forgot-password', { email: ['a@test.local'] }],
    ['/api/auth/verify-reset-otp', { email: 'not-an-email', otp: '123456' }],
    ['/api/auth/verify-reset-otp', { email: 'a@test.local', otp: 123456 }],
];
for (const [path, body] of malformed) {
    await check(`${path} rejects ${JSON.stringify(body)}`, async () => {
        const res = await fetch(`${base}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        assert.equal(res.status, 400);
        const { message } = await res.json() as { message?: string };
        assert.match(message ?? '', /^Validation failed/);
    });
}

await check('login is rate limited', async () => {
    const attempt = () => fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nobody', password: 'wrongpassword' }),
    });
    let limited = false;
    for (let i = 0; i < 25; i++) {
        const res = await attempt();
        if (res.status === 429) { limited = true; break; }
    }
    assert.ok(limited, 'expected a 429 within 25 attempts');
});

await check('rotating X-Forwarded-For does not reset the limit', async () => {
    // Cloudflare appends to X-Forwarded-For rather than replacing it, so if the
    // trusted hop count reaches a client-supplied entry, an attacker gets a new
    // bucket per request and the limit means nothing. The limiter must key on
    // something the client cannot choose.
    const hit = (xff: string) => fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': xff },
        body: JSON.stringify({ username: 'nobody', password: 'wrongpassword' }),
    });
    let limited = false;
    for (let i = 0; i < 40; i++) {
        const res = await hit(`203.0.113.${i % 254}`);
        if (res.status === 429) { limited = true; break; }
    }
    assert.ok(limited, 'a rotating X-Forwarded-For bypassed the rate limit');
});

// --- cases that need accounts of their own -------------------------------

const stamp = Date.now();
const mkUser = async (n: string, extra: Partial<typeof users.$inferInsert> = {}) => {
    const [row] = await db.insert(users).values({
        username: `zz_${n}_${stamp}`,
        email: `zz_${n}_${stamp}@test.local`,
        passwordHash: await hashPassword('Passw0rdLong1'),
        name: n,
        birthdate: new Date('1990-01-01'),
        role: UserRole.Volunteer,
        isVerified: true,
        isActive: true,
        authProvider: 'local',
        ...extra,
    }).returning();
    return row!;
};
const holder = await mkUser('holder');
const claims = { id: holder.id, email: holder.email, role: UserRole.Volunteer };
const bearer = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
const accessToken = createAccessToken(claims);

await check('an access token still opens protected routes', async () => {
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: bearer(accessToken) })).status, 200);
    assert.equal((await fetch(`${base}/api/notifications`, { headers: bearer(accessToken) })).status, 200);
});

// The refresh token used to be signed with the same secret and claims, so the
// 7-day cookie value worked as a Bearer token on every route.
await check('a refresh token is not accepted as an access token', async () => {
    const legacy = jwt.sign(claims, process.env.JWT_SECRET!, { expiresIn: '7d' }); // as issued before the typ claim
    for (const token of [createRefreshToken(claims), legacy]) {
        assert.equal((await fetch(`${base}/api/auth/me`, { headers: bearer(token) })).status, 401);
        assert.equal((await fetch(`${base}/api/notifications`, { headers: bearer(token) })).status, 401);
    }
});

await check('a token signed with another algorithm is refused', async () => {
    const hs384 = jwt.sign(claims, process.env.JWT_SECRET!, { algorithm: 'HS384', expiresIn: '1h' });
    assert.equal((await fetch(`${base}/api/notifications`, { headers: bearer(hs384) })).status, 401);
});

// Called on the service, not over HTTP: the per-IP otpLimiter would answer 429
// long before the per-account cap shows, which is the point of having both.
console.log(results.join('\n'));
console.log(process.exitCode ? '\nSECURITY SMOKE FAILED' : '\nSECURITY SMOKE PASSED');
await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
server.close();
await closeDb();
