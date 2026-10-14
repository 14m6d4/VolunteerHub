/**
 * Checks the demo seed: a fresh seed gives every demo event its own cover image,
 * and `--covers` puts them back on demo events that already exist (prod) without
 * touching anything else, as often as it is run.
 *
 * WIPES THE DATABASE (it runs the seed). Needs a migrated PostgreSQL (DATABASE_URL).
 * Run with: npm run check:seed. Leaves the demo dataset in place; the zz_ fixtures
 * and the temp uploads folder are removed afterwards.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import 'dotenv/config';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { asc, eq, like } from 'drizzle-orm';
import { closeDb, db } from '../db/client.ts';
import { events, users } from '../db/schema.ts';
import { hashPassword } from '../utils/password.util.ts';

const dir = await mkdtemp(path.join(tmpdir(), 'vh-seed-'));
const stamp = Date.now();

const seed = (args: string[], env: Record<string, string> = {}) => {
  const run = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed.ts', ...args], {
    cwd: path.join(import.meta.dirname, '..'), encoding: 'utf8',
    env: { ...process.env, UPLOADS_DIR: dir, ...env },
  });
  // stderr only: a fresh seed prints the demo password on stdout.
  assert.equal(run.status, 0, `seed ${args.join(' ')} failed:\n${run.stderr}`);
};
const allEvents = () => db.select().from(events).orderBy(asc(events.id));
const demoEvents = async () => (await db.select({ event: events }).from(events)
  .innerJoin(users, eq(users.id, events.managerId))
  .where(like(users.email, '%@demo.volunteerhub.test'))
  .orderBy(asc(events.id))).map((r) => r.event);
const stored = async () => new Set(await readdir(dir));

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

let covers = new Map<string, string>();

await check('a fresh seed gives each of the 13 demo events its own stored cover image', async () => {
  seed([]);
  const demo = await demoEvents();
  assert.equal(demo.length, 13);
  covers = new Map(demo.map((e) => [e.id, e.image]));
  assert.equal(new Set(covers.values()).size, 13, 'all different');
  const files = await stored();
  for (const image of covers.values()) {
    assert.match(image, /^\/uploads\/[^/]+\.webp$/);
    assert.ok(files.has(path.basename(image)), `${image} is in the uploads folder`);
  }
});

await check('--covers restores missing demo covers on a fresh volume, touches nothing else, and can run again', async () => {
  // Prod drift: a manager cleared one cover and uploaded their own for another;
  // someone else runs an event that shares a demo title; the volume is new.
  const [first, second] = await demoEvents();
  const uploaded = '/uploads/0123456789abcdef0123456789abcdef.webp';
  covers.set(second!.id, uploaded);
  await db.update(events).set({ image: '' }).where(eq(events.id, first!.id));
  await db.update(events).set({ image: uploaded }).where(eq(events.id, second!.id));
  const [stranger] = await db.insert(users).values({
    username: `zz_seed_${stamp}`, email: `zz_seed_${stamp}@test.local`, passwordHash: await hashPassword('Passw0rdLong1'),
    name: 'seed', role: 'manager', isVerified: true,
  }).returning();
  await db.insert(events).values({ title: first!.title, startAt: new Date(), managerId: stranger!.id, image: '' });
  await rm(dir, { recursive: true, force: true });

  const before = await allEvents();
  const usersBefore = await db.$count(users);
  // As on the VM: production, no demo password needed.
  for (let run = 0; run < 2; run++) seed(['--covers'], { NODE_ENV: 'production', SEED_DEMO_PASSWORD: '' });

  const after = await allEvents();
  assert.equal(await db.$count(users), usersBefore, 'no accounts added');
  assert.deepEqual(after.map(({ image, ...rest }) => rest), before.map(({ image, ...rest }) => rest), 'only images change');
  for (const e of after) assert.equal(e.image, covers.get(e.id) ?? before.find((b) => b.id === e.id)!.image, e.title);
  const files = await stored();
  for (const image of covers.values()) {
    if (image !== uploaded) assert.ok(files.has(path.basename(image)), `${image} copied again`);
  }
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'SEED CHECK FAILED' : 'SEED CHECK PASSED');

await db.delete(users).where(like(users.username, `zz\\_seed\\_${stamp}`));
await rm(dir, { recursive: true, force: true });
await closeDb();
