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

// --- Profile picture life and user deletion (#86) ---
{
  const { events } = await import('../db/schema.ts');
  const { eq } = await import('drizzle-orm');
  const mkUser = async (tag: string, role = UserRole.Volunteer, profilePicture?: string) => {
    const [u] = await db.insert(users).values({
      username: `zz_${tag}_${stamp}`, email: `zz_${tag}_${stamp}@test.local`,
      passwordHash: await hashPassword('Passw0rdLong1'), name: tag, birthdate: new Date('1990-01-01'),
      role, isVerified: true, profilePicture,
    }).returning();
    return { id: u!.id, token: createAccessToken({ id: u!.id, email: u!.email, role }) };
  };
  let ip = 0;
  const call = (method: string, url: string, token: string, body?: unknown) => fetch(`${base}${url}`, {
    method, body: JSON.stringify(body ?? {}),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.9.1.${++ip}` },
  });
  const dataUrl = (b: Buffer) => `data:image/jpeg;base64,${b.toString('base64')}`;
  const patchProfile = (token: string, body: unknown) => call('PATCH', '/api/users/profile/secure', token, body);
  const pictureOf = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0]!.profilePicture!;

  await check('replacing a Profile picture serves the new file and removes the old one; an empty string clears it', async () => {
    const u = await mkUser('pp');
    let res = await patchProfile(u.token, { profilePicture: dataUrl(photo) });
    assert.equal(res.status, 200, await res.clone().text());
    const first = await pictureOf(u.id);
    assert.equal((await fetch(`${base}${first}`)).status, 200);

    res = await patchProfile(u.token, { profilePicture: dataUrl(photo) });
    assert.equal(res.status, 200);
    const second = await pictureOf(u.id);
    assert.notEqual(second, first);
    assert.equal((await fetch(`${base}${second}`)).status, 200);
    assert.ok(!(await files()).includes(path.basename(first)), 'old file removed');

    res = await patchProfile(u.token, { profilePicture: '' });
    assert.equal(res.status, 200);
    assert.ok(!(await files()).includes(path.basename(second)), 'cleared file removed');
  });

  await check('a wrong current password with a non-image data URL is 401 and stores nothing', async () => {
    const u = await mkUser('pw');
    const before = await files();
    const res = await patchProfile(u.token, {
      profilePicture: 'data:image/png;base64,bm90IGFuIGltYWdl', password: 'NewPassw0rd1', currentPassword: 'wrong-password',
    });
    assert.equal(res.status, 401);
    assert.deepEqual(await files(), before);
  });

  await check('a Profile picture over 2 MB is refused with 413 and a clear message', async () => {
    const u = await mkUser('big');
    const res = await patchProfile(u.token, { profilePicture: dataUrl(Buffer.alloc(2 * 1024 * 1024 + 1)) });
    assert.equal(res.status, 413);
    assert.match(((await res.json()) as { message: string }).message, /2 MB/);
  });

  await check('deleting a user removes their Profile picture, event Cover images and post images', async () => {
    const admin = await mkUser('adm', UserRole.Admin);
    const victim = await mkUser('del', UserRole.Manager, await saveImage(photo));
    const cover = await saveImage(photo);
    await db.insert(events).values({ title: 'zz', startAt: new Date(), managerId: victim.id, image: cover });
    const form = new FormData();
    form.append('content', 'zz');
    form.append('image', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'a.jpg');
    const made = await fetch(`${base}/api/posts`, {
      method: 'POST', body: form, headers: { Authorization: `Bearer ${victim.token}`, 'CF-Connecting-IP': '10.9.1.200' },
    });
    assert.equal(made.status, 201, await made.clone().text());
    const postImg = ((await made.json()) as { data: { image: string } }).data.image;
    const mine = [await pictureOf(victim.id), cover, postImg].map((u) => path.basename(u));
    const present = await files();
    for (const f of mine) assert.ok(present.includes(f), `${f} exists before`);

    const res = await call('DELETE', `/api/users/admin/${victim.id}`, admin.token);
    assert.equal(res.status, 200, await res.clone().text());
    const after = await files();
    for (const f of mine) assert.ok(!after.includes(f), `${f} removed`);
  });
}

out.forEach((line) => console.log(line));
console.log(process.exitCode ? 'UPLOADS CHECK FAILED' : 'UPLOADS CHECK PASSED');

await db.delete(users).where(like(users.username, `zz\\_%\\_${stamp}`));
await rm(dir, { recursive: true, force: true });
server.close();
await closeDb();
process.exit();
