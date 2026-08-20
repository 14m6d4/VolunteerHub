/**
 * Boots the Express app on an ephemeral port and asserts the security
 * middleware actually applies. No database required: every case here is
 * rejected before a handler touches Mongo.
 *
 * Run with: npm run smoke:security
 */
import assert from 'node:assert/strict';
import app from '../app.ts';

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

console.log(results.join('\n'));
console.log(process.exitCode ? '\nSECURITY SMOKE FAILED' : '\nSECURITY SMOKE PASSED');
server.close();
