/**
 * Checks the demo seed: a fresh seed gives every demo event its own cover image,
 * and `--covers` puts them back on demo events that already exist (prod) without
 * touching anything else, as often as it is run. `--reset-demo` brings the demo
 * dataset back as seeded, every time, and leaves non-demo users and their data alone.
 *
 * WIPES THE DATABASE (it runs the seed). Needs a migrated PostgreSQL (DATABASE_URL).
 * Run with: npm run check:seed. Leaves the demo dataset in place; the zz_ fixtures
 * and the temp uploads folder are removed afterwards.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import 'dotenv/config';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { asc, eq, like, notLike } from 'drizzle-orm';
import { closeDb, db } from '../db/client.ts';
import { events, posts, users } from '../db/schema.ts';
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

await check('--reset-demo restores the demo dataset, twice in a row, and leaves other users and their data alone', async () => {
  // Non-demo data: a manager with an event and a post with an image (the zz_ manager above has one too).
  const [real] = await db.insert(users).values({
    username: `zz_seed_${stamp}_r`, email: `zz_seed_${stamp}_r@test.local`, passwordHash: await hashPassword('Passw0rdLong1'),
    name: 'real', role: 'manager', isVerified: true, profilePicture: '/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp',
  }).returning();
  const [realEvent] = await db.insert(events).values({ title: 'Real Event', startAt: new Date(), managerId: real!.id }).returning();
  await db.insert(posts).values({ eventId: realEvent!.id, authorId: real!.id, content: 'real', image: '/uploads/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.webp' });
  const others = async () => ({
    users: await db.select().from(users).where(notLike(users.email, '%@demo.volunteerhub.test')).orderBy(asc(users.id)),
    events: (await db.select({ event: events }).from(events).innerJoin(users, eq(users.id, events.managerId))
      .where(notLike(users.email, '%@demo.volunteerhub.test')).orderBy(asc(events.id))).map((r) => r.event),
    posts: (await db.select({ post: posts }).from(posts).innerJoin(users, eq(users.id, posts.authorId))
      .where(notLike(users.email, '%@demo.volunteerhub.test')).orderBy(asc(posts.id))).map((r) => r.post),
  });
  const seeded = new Map((await demoEvents()).map((e) => [e.title, e]));

  // Damage, as a visitor on a demo account would: delete one event, edit another, upload a profile picture.
  const [gone, edited] = await demoEvents();
  await db.delete(events).where(eq(events.id, gone!.id));
  await db.update(events).set({ title: 'Vandalised', description: 'x', location: 'y' }).where(eq(events.id, edited!.id));
  const upload = 'cccccccccccccccccccccccccccccccc.webp';
  await writeFile(path.join(dir, upload), 'x');
  await db.update(users).set({ profilePicture: `/uploads/${upload}` }).where(eq(users.email, 'demo-dan@demo.volunteerhub.test'));
  const before = await others();

  for (let run = 0; run < 2; run++) {
    // As on the VM: production, password from the environment.
    seed(['--reset-demo'], { NODE_ENV: 'production', SEED_DEMO_PASSWORD: 'demo-password-long' });
    const demoUsers = await db.select().from(users).where(like(users.email, '%@demo.volunteerhub.test'));
    assert.equal(demoUsers.length, 15, `run ${run}: 3 managers and 12 volunteers`);
    assert.ok(!demoUsers.some((u) => u.role === 'admin'), 'no demo admin');
    const demo = await demoEvents();
    assert.equal(demo.length, 13, `run ${run}: demo events`);
    for (const e of demo) {
      const s = seeded.get(e.title);
      assert.ok(s, `${e.title} is a seeded title`);
      assert.deepEqual([e.description, e.location, e.status], [s.description, s.location, s.status], e.title);
      assert.match(e.image, /^\/uploads\/demo-[a-z0-9-]+\.webp$/, `${e.title} has its demo cover`);
    }
    assert.equal(new Set(demo.map((e) => e.title)).size, 13, 'every seeded event is back once');
    const demoPosts = await db.select({ id: posts.id }).from(posts).innerJoin(users, eq(users.id, posts.authorId))
      .where(like(users.email, '%@demo.volunteerhub.test'));
    assert.equal(demoPosts.length, 27, `run ${run}: demo posts`);
    assert.deepEqual(await others(), before, `run ${run}: non-demo users, events and posts unchanged`);
    assert.ok(!(await stored()).has(upload), 'the demo user\'s upload is deleted');
  }
});

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'SEED CHECK FAILED' : 'SEED CHECK PASSED');

await db.delete(users).where(like(users.username, `zz\\_seed\\_${stamp}%`));
await rm(dir, { recursive: true, force: true });
await closeDb();
