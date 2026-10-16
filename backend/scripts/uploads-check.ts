/**
 * Checks self-hosted image uploads: the image service against a temp folder
 * (re-encoding, the total cap, deletes), then the upload routes over HTTP
 * (the 2 MB per-file limit, serving /uploads, deleting the file with its post).
 *
 * Needs a migrated PostgreSQL (DATABASE_URL). Run with: npm run check:uploads
 * Fixtures are prefixed zz_ and removed afterwards, as is the temp folder.
 */
import assert from 'node:assert/strict';
import 'dotenv/config';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { like } from 'drizzle-orm';
import sharp from 'sharp';

// Read by image.service on import, so it has to be set before the app loads.
const dir = await mkdtemp(path.join(tmpdir(), 'vh-uploads-'));
process.env.UPLOADS_DIR = dir;

const { default: app } = await import('../app.ts');
const { closeDb, db } = await import('../db/client.ts');
const { users } = await import('../db/schema.ts');
const { saveImage, deleteImages } = await import('../services/image.service.ts');
const { hashPassword } = await import('../utils/password.util.ts');
const { createAccessToken } = await import('../utils/jwt.util.ts');
const { UserRole } = await import('../types/user.ts');

const stamp = Date.now();
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

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

const files = async () => (await readdir(dir)).sort();
const fileOf = (url: string) => path.join(dir, path.basename(url));

// A 3000x2000 JPEG carrying EXIF, as a phone photo would.
const photo = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#c33' } })
  .jpeg().withExif({ IFD0: { Copyright: 'zz-check' } }).toBuffer();
assert.ok((await sharp(photo).metadata()).exif, 'fixture has EXIF');

await check('an upload is stored as WebP, long edge 1600, without metadata', async () => {
  const url = await saveImage(photo);
  assert.match(url, /^\/uploads\/[0-9a-f]{32}\.webp$/);
  const meta = await sharp(await readFile(fileOf(url))).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 1067);
  assert.equal(meta.exif, undefined);
});

await check('two uploads of the same image get different names', async () => {
  assert.notEqual(await saveImage(photo), await saveImage(photo));
});

await check('a file that is not an image is refused with 400', async () => {
  await assert.rejects(saveImage(Buffer.from('not an image')), { statusCode: 400 });
});

await check('uploads are refused once the folder holds the cap', async () => {
  const before = await files();
  await assert.rejects(saveImage(photo, 1), { statusCode: 507, message: /storage is full/i });
  assert.deepEqual(await files(), before, 'nothing written');
});

await check('deleteImages removes our files and ignores everything else', async () => {
  const url = await saveImage(photo);
  await deleteImages(url, url, '', null, undefined, 'https://example.com/a.webp', '/uploads/../../etc/passwd',
    '/uploads/00000000000000000000000000000000.webp');
  assert.ok(!(await files()).includes(path.basename(url)));
});

const [row] = await db.insert(users).values({
  username: `zz_up_${stamp}`, email: `zz_up_${stamp}@test.local`, passwordHash: await hashPassword('Passw0rdLong1'),
  name: 'up', birthdate: new Date('1990-01-01'), role: UserRole.Volunteer, isVerified: true,
}).returning();
const token = createAccessToken({ id: row!.id, email: row!.email, role: UserRole.Volunteer });

const postImage = (bytes: Buffer) => {
  const form = new FormData();
  form.append('content', 'zz');
  form.append('image', new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'a.jpg');
  return fetch(`${base}/api/posts`, {
    method: 'POST', body: form,
    headers: { Authorization: `Bearer ${token}`, 'CF-Connecting-IP': '10.9.0.1' },
  });
};

await check('a file over 2 MB is rejected with 413 and a clear message', async () => {
  const res = await postImage(Buffer.alloc(2 * 1024 * 1024 + 1));
  assert.equal(res.status, 413);
  assert.match(((await res.json()) as { message: string }).message, /2 MB/);
});

await check('a post image is served from /uploads and deleted with its post', async () => {
  const res = await postImage(photo);
  assert.equal(res.status, 201, await res.clone().text());
  const post = ((await res.json()) as { data: { _id: string; image: string } }).data;
  assert.match(post.image, /^\/uploads\/[0-9a-f]{32}\.webp$/);

  const img = await fetch(`${base}${post.image}`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/webp');

  const del = await fetch(`${base}/api/posts/${post._id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'CF-Connecting-IP': '10.9.0.2' },
  });
  assert.equal(del.status, 200);
  assert.ok(!(await files()).includes(path.basename(post.image)));
});

// --- Cover images: the Event module owns their whole life -------------------
{
  const { discussions, events, posts } = await import('../db/schema.ts');
  const { eq } = await import('drizzle-orm');
  const mkManager = async (tag: string) => {
    const [u] = await db.insert(users).values({
      username: `zz_cv${tag}_${stamp}`, email: `zz_cv${tag}_${stamp}@test.local`,
      passwordHash: await hashPassword('Passw0rdLong1'), name: tag, birthdate: new Date('1990-01-01'),
      role: UserRole.Manager, isVerified: true,
    }).returning();
    return { id: u!.id, token: createAccessToken({ id: u!.id, email: u!.email, role: UserRole.Manager }) };
  };
  const owner = await mkManager('own');
  const outsider = await mkManager('out');
  let ip = 0;
  const sendEvent = (method: 'POST' | 'PUT', who: { token: string }, url: string, fields: Record<string, string>, file?: Buffer) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    if (file) form.append('image', new Blob([new Uint8Array(file)], { type: 'image/jpeg' }), 'c.jpg');
    return fetch(`${base}${url}`, {
      method, body: form, headers: { Authorization: `Bearer ${who.token}`, 'CF-Connecting-IP': `10.9.1.${++ip}` },
    });
  };
  const eventFields = (title: string) => ({ title, startAt: new Date(Date.now() + 864e5).toISOString() });
  const mkEvent = async (cover: Buffer) => {
    const res = await sendEvent('POST', owner, '/api/events', eventFields('zz cover event'), cover);
    assert.equal(res.status, 201, await res.clone().text());
    return ((await res.json()) as { data: { _id: string; image: string } }).data;
  };
  const notAnImage = Buffer.from('not an image');

  await check('an event is created with a Cover image served from /uploads; an invalid creation leaves no file', async () => {
    const ev = await mkEvent(photo);
    assert.match(ev.image, /^\/uploads\/[0-9a-f]{32}\.webp$/);
    assert.equal((await fetch(`${base}${ev.image}`)).status, 200);

    const before = await files();
    const bad = await sendEvent('POST', owner, '/api/events', { title: 'x', startAt: 'nope' }, photo);
    assert.equal(bad.status, 400);
    assert.deepEqual(await files(), before);
    await db.delete(events).where(eq(events.id, ev._id));
  });

  await check('replacing a Cover image serves the new file and removes the old one', async () => {
    const ev = await mkEvent(photo);
    const res = await sendEvent('PUT', owner, `/api/events/${ev._id}`, { title: 'zz cover event 2' }, photo);
    assert.equal(res.status, 200, await res.clone().text());
    const next = ((await res.json()) as { data: { image: string } }).data.image;
    assert.notEqual(next, ev.image);
    assert.equal((await fetch(`${base}${next}`)).status, 200);
    assert.ok(!(await files()).includes(path.basename(ev.image)), 'old file removed');
    await db.delete(events).where(eq(events.id, ev._id));
  });

  await check('a manager who does not run the event gets 403 even with a non-image, and nothing is stored', async () => {
    const ev = await mkEvent(photo);
    const before = await files();
    const res = await sendEvent('PUT', outsider, `/api/events/${ev._id}`, { title: 'zz hijack' }, notAnImage);
    assert.equal(res.status, 403);
    const real = await sendEvent('PUT', outsider, `/api/events/${ev._id}`, { title: 'zz hijack' }, photo);
    assert.equal(real.status, 403);
    assert.deepEqual(await files(), before);
    await db.delete(events).where(eq(events.id, ev._id));
  });

  await check('updating an unknown event with a file gets 404 and nothing is stored', async () => {
    const before = await files();
    const res = await sendEvent('PUT', owner, '/api/events/00000000-0000-4000-8000-000000000000', { title: 'zz ghost' }, photo);
    assert.equal(res.status, 404);
    assert.deepEqual(await files(), before);
  });

  await check('deleting an event removes its Cover image and its posts images, on the event and in its discussion', async () => {
    const ev = await mkEvent(photo);
    const [disc] = await db.insert(discussions).values({ eventId: ev._id }).returning();
    const onEvent = await saveImage(photo);
    const inDiscussion = await saveImage(photo);
    await db.insert(posts).values([
      { eventId: ev._id, authorId: owner.id, content: 'zz', image: onEvent },
      { discussionId: disc!.id, authorId: owner.id, content: 'zz', image: inDiscussion },
    ]);
    const res = await fetch(`${base}/api/events/${ev._id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${owner.token}`, 'CF-Connecting-IP': `10.9.1.${++ip}` },
    });
    assert.equal(res.status, 200, await res.clone().text());
    const left = await files();
    for (const url of [ev.image, onEvent, inDiscussion]) assert.ok(!left.includes(path.basename(url)), `${url} removed`);
  });
}

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'UPLOADS CHECK FAILED' : 'UPLOADS CHECK PASSED');

await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
await rm(dir, { recursive: true, force: true });
server.close();
await closeDb();
process.exit();
