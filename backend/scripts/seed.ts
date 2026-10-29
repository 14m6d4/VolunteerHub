/**
 * Wipes the database and fills it with a dev/demo dataset: 1 admin, 3 managers,
 * 12 volunteers, events in every status, registrations, discussions, posts,
 * comments, likes, friends, notifications and a report.
 *
 * Every account is demo-*@demo.volunteerhub.test and shares one password that is
 * generated on each run and printed at the end. Nothing
 * here is a real address or a credential from an earlier seed.
 *
 * Needs a migrated PostgreSQL (DATABASE_URL). Run with: npm run db:seed
 *
 * With --append it keeps what is there and adds no demo admin, so the real admin
 * stays in charge; that is the only mode allowed in production (prod image:
 * node dist/scripts/seed.js --append). The unique emails make a second run fail
 * before it inserts anything. Append mode takes the password from
 * SEED_DEMO_PASSWORD and never prints it: on the VM, container stdout is shipped
 * to Grafana Cloud.
 *
 * --reset-demo first deletes every demo user, and through the foreign keys all
 * they own (what real users wrote on demo content included), then adds the data
 * as --append does. Delete and insert share one transaction, so a failure keeps
 * the old demo data; the orphaned uploads are deleted after the commit. Allowed in
 * production and run nightly there (docker-compose.prod.yml, demo-reset).
 *
 * All modes give each demo event its cover image from demo-covers/. With --covers
 * it does only that, on the demo events that already exist (matched by title and
 * demo manager) and have no cover a manager uploaded, and is safe to run again; it
 * is allowed in production
 * (node dist/scripts/seed.js --covers).
 */
import { randomBytes } from 'node:crypto';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import { and, eq, inArray, like, or } from 'drizzle-orm';
import { closeDb, db } from '../db/client.ts';
import {
  commentLikes, comments, discussions, events, friendRequests, friendships, notifications,
  postLikes, posts, pushSubscriptions, registrations, reports, users,
} from '../db/schema.ts';
import { deleteImages, UPLOADS_DIR } from '../services/image.service.ts';
import { imagesDeletedWithEvents } from '../utils/event.util.ts';
import { hashPassword } from '../utils/password.util.ts';
import { DEMO_EMAIL_DOMAIN } from '../utils/demo.util.ts';
import { notify } from '../services/notification.service.ts';
import { NotificationType } from '../types/notification.ts';

const eventSpecs = [
  { title: 'Riverside Clean-up', status: 'approved', start: 5, max: 10, tags: ['environment', 'outdoor'] },
  { title: 'Food Bank Sorting Day', status: 'approved', start: 9, max: 8, tags: ['community', 'food'] },
  { title: 'Reading Buddies at the Library', status: 'approved', start: 14, max: null, tags: ['education', 'children'] },
  { title: 'Community Garden Planting', status: 'approved', start: 21, max: 6, tags: ['environment', 'community'] },
  { title: 'Charity Fun Run', status: 'pending', start: 30, max: 40, tags: ['sports', 'charity'] },
  { title: 'Winter Coat Drive', status: 'draft', start: 45, max: null, tags: ['charity'] },
  { title: 'Beach Cleanup (rained out)', status: 'cancelled', start: -3, max: 15, tags: ['environment'] },
  { title: 'Spring Tree Planting', status: 'finished', start: -20, max: 12, tags: ['environment', 'outdoor'] },
  // Years out, so a long-lived demo (prod --append) still has upcoming events to discover.
  // ponytail: they go stale after ~5 years; reseed or shift dates if the demo lives that long.
  { title: 'Mangrove Restoration Weekend', status: 'approved', start: 365, max: 30, tags: ['environment', 'outdoor'] },
  { title: 'Blood Donation Drive', status: 'approved', start: 545, max: null, tags: ['health', 'community'] },
  { title: 'Animal Shelter Open Day', status: 'approved', start: 730, max: 20, tags: ['animals', 'community'] },
  { title: 'Heritage Archive Digitisation', status: 'approved', start: 1095, max: 10, tags: ['education', 'culture'] },
  { title: 'Senior Tech Help Desk', status: 'approved', start: 1825, max: 15, tags: ['education', 'community'] },
] as const;

/**
 * Copies each demo cover into the uploads folder and points the demo events with
 * that title at it. The files keep fixed demo-* names, not saveImage's random hex
 * ones, so deleteImages never removes them (several rows may share one) and a
 * second run just overwrites them.
 */
async function setCovers() {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const demoManagers = db.select({ id: users.id }).from(users).where(like(users.email, `%@${DEMO_EMAIL_DOMAIN}`));
  let updated = 0;
  for (const { title } of eventSpecs) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await copyFile(path.join(import.meta.dirname, 'demo-covers', `${slug}.webp`), path.join(UPLOADS_DIR, `demo-${slug}.webp`));
    updated += (await db.update(events).set({ image: `/uploads/demo-${slug}.webp` })
      .where(and(eq(events.title, title), inArray(events.managerId, demoManagers),
        // A cover a manager uploaded since stays.
        or(eq(events.image, ''), like(events.image, '/uploads/demo-%'))))
      .returning({ id: events.id })).length;
  }
  return updated;
}

if (process.argv.includes('--covers')) {
  console.log(`Set cover images on ${await setCovers()} demo events.`);
  await closeDb();
  process.exit();
}

const reset = process.argv.includes('--reset-demo');
// Keep the non-demo data and add no demo admin: what production allows.
const keepNonDemoData = reset || process.argv.includes('--append');
// Dropping data or adding a demo admin has no place in production.
if (process.env.NODE_ENV === 'production' && !keepNonDemoData) {
  console.error('Refusing to seed: NODE_ENV is production (use --append or --reset-demo).');
  process.exit(1);
}

const password = keepNonDemoData ? process.env.SEED_DEMO_PASSWORD ?? '' : randomBytes(9).toString('base64url');
if (password.length < 12) {
  console.error('Refusing to seed: --append and --reset-demo need SEED_DEMO_PASSWORD of at least 12 characters.');
  process.exit(1);
}
const passwordHash = await hashPassword(password);
const day = 24 * 60 * 60 * 1000;
const from = (days: number, hours = 9) => new Date(Date.now() + days * day + hours * 3600_000);
const demoUser = (name: string, role: 'volunteer' | 'manager' | 'admin') => ({
  username: `demo_${name}`,
  name: `Demo ${name[0]!.toUpperCase()}${name.slice(1)}`,
  email: `demo-${name}@${DEMO_EMAIL_DOMAIN}`,
  passwordHash,
  role,
  isVerified: true,
});

const demoEmail = like(users.email, `%@${DEMO_EMAIL_DOMAIN}`);

// One transaction: a failed reset leaves the old demo data in place.
const seedAll = () => db.transaction(async (tx) => {
  // The files the reset's cascades orphan: what the demo users uploaded, and the
  // covers and post images of their events (posts real users wrote there included).
  // Read in the delete's transaction, and the avatars from the delete itself.
  const orphans: (string | null)[] = [];
  if (reset) {
    const demoIds = tx.select({ id: users.id }).from(users).where(demoEmail);
    const postImages = await tx.select({ image: posts.image }).from(posts).where(inArray(posts.authorId, demoIds));
    orphans.push(...postImages.map((r) => r.image));
    orphans.push(...await imagesDeletedWithEvents(inArray(events.managerId, demoIds), tx));
    // Every demo user, and through the foreign keys all they own; no one else.
    const deleted = await tx.delete(users).where(demoEmail).returning({ image: users.profilePicture });
    orphans.push(...deleted.map((r) => r.image));
  }
  // Children first, so the order doesn't depend on cascades.
  if (!keepNonDemoData) for (const table of [
    commentLikes, postLikes, comments, posts, discussions, registrations, notifications, reports,
    friendships, friendRequests, pushSubscriptions, events, users,
  ]) await tx.delete(table);

  if (!keepNonDemoData) await tx.insert(users).values(demoUser('admin', 'admin'));
  const managers = await tx.insert(users)
    .values(['ava', 'ben', 'chloe'].map((n) => demoUser(n, 'manager'))).returning();
  const volunteers = await tx.insert(users)
    .values(['dan', 'eve', 'finn', 'gia', 'hugo', 'ivy', 'jack', 'kai', 'lena', 'milo', 'nina', 'omar']
      .map((n) => demoUser(n, 'volunteer'))).returning();

  const eventRows = await tx.insert(events).values(eventSpecs.map((s, i) => ({
    title: s.title,
    description: `${s.title}: bring water, gloves and good company.`,
    location: ['Riverside Park', 'Central Food Bank', 'City Library', 'Maple Street Garden', 'Old Town Square', 'Town Hall', 'North Beach', 'Elm Woods',
      'Mangrove Bay', 'City Hospital', 'Happy Paws Shelter', 'Heritage Archive', 'Community Centre'][i]!,
    startAt: from(s.start),
    endAt: from(s.start, 13),
    maxMembers: s.max,
    status: s.status,
    managerId: managers[i % managers.length]!.id,
    tags: [...s.tags],
  })) ).returning();

  // Registrations: every volunteer joins a few events; the list below is (event index, volunteer index, status).
  const regs: [number, number, 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'][] = [];
  for (let v = 0; v < volunteers.length; v++) {
    regs.push([v % 4, v, v % 5 === 4 ? 'pending' : 'approved']);
    regs.push([(v + 1) % 4, v, v % 6 === 5 ? 'rejected' : 'approved']);
  }
  for (let v = 0; v < 6; v++) regs.push([7, v, 'completed']);
  for (let v = 0; v < volunteers.length; v++) regs.push([8 + (v % 5), v, 'approved']);
  regs.push([6, 0, 'cancelled']);
  const regRows = regs.map(([e, v, status]) => ({
      eventId: eventRows[e]!.id, volunteerId: volunteers[v]!.id, status,
      completedAt: status === 'completed' ? from(-19) : null,
    }));
  await tx.insert(registrations).values(regRows);

  // An event counts the volunteers it has accepted, capped at its size.
  for (const [i, e] of eventRows.entries()) {
    const members = regRows.filter((r) => r.eventId === e.id && (r.status === 'approved' || r.status === 'completed')).length;
    const cap = eventSpecs[i]!.max;
    await tx.update(events).set({ currentMembers: cap === null ? members : Math.min(members, cap) })
      .where(eq(events.id, e.id));
  }

  const approved = eventRows.filter((e) => e.status === 'approved');
  const discussionRows = await tx.insert(discussions).values(approved.map((e) => ({ eventId: e.id }))).returning();
  const postRows = await tx.insert(posts).values(approved.flatMap((e, i) => [
    { eventId: e.id, authorId: managers[i % managers.length]!.id, content: `Welcome to ${e.title}! Details are pinned here.`, pinned: true },
    { eventId: e.id, authorId: volunteers[i]!.id, content: 'Can anyone share a ride from the station?' },
    { discussionId: discussionRows[i]!.id, authorId: volunteers[(i + 4) % volunteers.length]!.id, content: 'What should I bring?' },
  ])).returning();
  const commentRows = await tx.insert(comments).values(postRows.map((p, i) => ({
    postId: p.id, authorId: volunteers[(i + 2) % volunteers.length]!.id, content: 'Count me in!',
  }))).returning();
  await tx.insert(postLikes).values(postRows.flatMap((p, i) =>
    [i, i + 1, i + 2].map((v) => ({ postId: p.id, userId: volunteers[v % volunteers.length]!.id }))));
  await tx.insert(commentLikes).values(commentRows.map((c, i) => ({ commentId: c.id, userId: volunteers[(i + 5) % volunteers.length]!.id })));

  // Friends: dan–eve and dan–finn are accepted; gia has a pending request to dan.
  const [dan, eve, finn, gia] = volunteers as [typeof volunteers[0], typeof volunteers[0], typeof volunteers[0], typeof volunteers[0]];
  await tx.insert(friendRequests).values([
    { senderId: dan.id, receiverId: eve.id, status: 'accepted' },
    { senderId: finn.id, receiverId: dan.id, status: 'accepted' },
    { senderId: gia.id, receiverId: dan.id, status: 'pending' },
  ]);
  // One row per pair, smaller id first.
  await tx.insert(friendships).values([[dan.id, eve.id], [dan.id, finn.id]]
    .map(([a, b]) => (a! < b! ? { userLow: a!, userHigh: b! } : { userLow: b!, userHigh: a! })));

  await tx.insert(reports).values({
    reporterId: eve.id, targetId: postRows[1]!.id, targetType: 'post', reason: 'spam', description: 'Demo report for the admin queue.',
  });
  return { managers, volunteers, eventRows, dan, gia, orphans };
});

// The raw error is a Drizzle query error whose params hold the demo password's
// bcrypt hash, and container stdout is shipped, so log only the SQLSTATE.
const seeded = await seedAll().catch((err: { code?: string; cause?: { code?: string } }) => {
  console.error(`Seeding failed (SQLSTATE ${err?.cause?.code ?? err?.code ?? 'unknown'}); the transaction rolled back.`);
  return process.exit(1);
});
const { managers, volunteers, eventRows, dan, gia, orphans } = seeded;

await deleteImages(...orphans);
// After the commit, not through tx: setCovers copies files and is shared with
// --covers, and notify writes through db (the one writer of notification rows).
await setCovers();
await notify({ userId: dan.id }, NotificationType.EVENT_UPDATED, { eventId: eventRows[0]!.id, eventTitle: eventRows[0]!.title }, managers[0]!.id);
await notify({ userId: dan.id }, NotificationType.FRIEND_REQUEST_RECEIVED, { senderId: gia.id }, gia.id);

console.log(`Seeded ${managers.length + volunteers.length + (keepNonDemoData ? 0 : 1)} accounts, ${eventRows.length} events.`);
if (!keepNonDemoData) console.log(`Password for every account: ${password}`);
if (!keepNonDemoData) console.log('Admin: demo-admin@demo.volunteerhub.test');
console.log('Managers: demo-ava@, demo-ben@, demo-chloe@demo.volunteerhub.test');
console.log('Volunteers: demo-dan@ ... demo-omar@demo.volunteerhub.test');
await closeDb();
