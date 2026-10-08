/**
 * Checks the request ID and the metrics endpoint over HTTP: boot the exported
 * app on an ephemeral port and assert on responses. Needs no database (every
 * request is rejected or answered before a query), only the usual dummy
 * env vars the app needs to import.
 *
 * Run with: npm run check:observability
 */
import assert from 'node:assert/strict';
import app from '../app.ts';
import { closeDb } from '../db/client.ts';

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

const metrics = async () => (await fetch(`${base}/metrics`)).text();

await check('a response carries a generated request ID', async () => {
    const res = await fetch(`${base}/api/nope`);
    assert.match(res.headers.get('x-request-id') ?? '', /^[\w.-]{8,}$/);
});

await check('an incoming request ID round-trips', async () => {
    const res = await fetch(`${base}/api/nope`, { headers: { 'X-Request-Id': 'trace-abc.123' } });
    assert.equal(res.headers.get('x-request-id'), 'trace-abc.123');
});

await check('an unsafe incoming request ID is replaced', async () => {
    const res = await fetch(`${base}/api/nope`, { headers: { 'X-Request-Id': 'bad id with spaces' } });
    const id = res.headers.get('x-request-id');
    assert.ok(id && id !== 'bad id with spaces');
});

await check('an error raised before the routes (CORS) still gets an ID and a JSON body', async () => {
    const res = await fetch(`${base}/api/events`, { headers: { Origin: 'https://evil.example' } });
    assert.ok(res.headers.get('x-request-id'));
    assert.equal((await res.json() as { status: string }).status, 'error');
});

await check('metrics expose default process metrics', async () => {
    assert.match(await metrics(), /^process_cpu_user_seconds_total /m);
});

await check('request counter and histogram use the route template', async () => {
    const res = await fetch(`${base}/api/events/raw-id-12345/stats`);
    assert.equal(res.status, 401);
    const body = await metrics();
    assert.match(body, /http_requests_total\{[^}]*method="GET"[^}]*route="\/api\/events\/:id\/stats"[^}]*status_class="4xx"[^}]*\} 1/);
    assert.match(body, /http_request_duration_seconds_bucket\{[^}]*route="\/api\/events\/:id\/stats"/);
    assert.ok(!body.includes('raw-id-12345'), 'the raw path leaked into a label');
});

await check('unmatched paths collapse into one series', async () => {
    await fetch(`${base}/api/scanner-probe-98765`);
    const body = await metrics();
    assert.match(body, /route="unmatched"/);
    assert.ok(!body.includes('scanner-probe-98765'), 'the raw path leaked into a label');
});

await check('health requests are counted, so a 503 reaches the 5xx alert', async () => {
    await fetch(`${base}/api/health`);
    assert.match(await metrics(), /http_requests_total\{[^}]*route="\/api\/health"/);
});

await check('metrics are not served on the public API prefix', async () => {
    const res = await fetch(`${base}/api/metrics`);
    assert.equal(res.status, 404);
    assert.ok(!(await res.text()).includes('process_cpu'));
});

await check('metrics refuse a request that came through a proxy', async () => {
    const res = await fetch(`${base}/metrics`, { headers: { 'X-Forwarded-For': '203.0.113.7' } });
    assert.equal(res.status, 404);
    assert.ok(!(await res.text()).includes('process_cpu'));
});

console.log(results.join('\n'));
console.log(process.exitCode ? '\nOBSERVABILITY CHECK FAILED' : '\nOBSERVABILITY CHECK PASSED');
server.close();
await closeDb();
