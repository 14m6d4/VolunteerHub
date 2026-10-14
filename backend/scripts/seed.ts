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
 */
import { randomBytes } from 'node:crypto';
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { closeDb, db } from '../db/client.ts';
import {
  commentLikes, comments, discussions, events, friendRequests, friendships, notifications,
  postLikes, posts, pushSubscriptions, registrations, reports, users,
} from '../db/schema.ts';
import { hashPassword } from '../utils/password.util.ts';

const append = process.argv.includes('--append');
// Dropping data or adding a demo admin has no place in production.
if (process.env.NODE_ENV === 'production' && !append) {
  console.error('Refusing to seed: NODE_ENV is production (use --append).');
  process.exit(1);
}

const password = append ? process.env.SEED_DEMO_PASSWORD ?? '' : randomBytes(9).toString('base64url');
if (password.length < 12) {
  console.error('Refusing to seed: --append needs SEED_DEMO_PASSWORD of at least 12 characters.');
  process.exit(1);
}
const passwordHash = await hashPassword(password);
const day = 24 * 60 * 60 * 1000;
const from = (days: number, hours = 9) => new Date(Date.now() + days * day + hours * 3600_000);
const demoUser = (name: string, role: 'volunteer' | 'manager' | 'admin') => ({
  username: `demo_${name}`,
  name: `Demo ${name[0]!.toUpperCase()}${name.slice(1)}`,
  email: `demo-${name}@demo.volunteerhub.test`,
  passwordHash,
  role,
  isVerified: true,
});

// Children first, so the order doesn't depend on cascades.
if (!append) for (const table of [
  commentLikes, postLikes, comments, posts, discussions, registrations, notifications, reports,
  friendships, friendRequests, pushSubscriptions, events, users,
]) await db.delete(table);

if (!append) await db.insert(users).values(demoUser('admin', 'admin'));
const managers = await db.insert(users)
  .values(['ava', 'ben', 'chloe'].map((n) => demoUser(n, 'manager'))).returning();
const volunteers = await db.insert(users)
  .values(['dan', 'eve', 'finn', 'gia', 'hugo', 'ivy', 'jack', 'kai', 'lena', 'milo', 'nina', 'omar']
    .map((n) => demoUser(n, 'volunteer'))).returning();

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

const eventRows = await db.insert(events).values(eventSpecs.map((s, i) => ({
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
await db.insert(registrations).values(regRows);

// An event counts the volunteers it has accepted, capped at its size.
for (const [i, e] of eventRows.entries()) {
  const members = regRows.filter((r) => r.eventId === e.id && (r.status === 'approved' || r.status === 'completed')).length;
  const cap = eventSpecs[i]!.max;
  await db.update(events).set({ currentMembers: cap === null ? members : Math.min(members, cap) })
    .where(eq(events.id, e.id));
}

const approved = eventRows.filter((e) => e.status === 'approved');
const discussionRows = await db.insert(discussions).values(approved.map((e) => ({ eventId: e.id }))).returning();
const postRows = await db.insert(posts).values(approved.flatMap((e, i) => [
  { eventId: e.id, authorId: managers[i % managers.length]!.id, content: `Welcome to ${e.title}! Details are pinned here.`, pinned: true },
  { eventId: e.id, authorId: volunteers[i]!.id, content: 'Can anyone share a ride from the station?' },
  { discussionId: discussionRows[i]!.id, authorId: volunteers[(i + 4) % volunteers.length]!.id, content: 'What should I bring?' },
])).returning();
const commentRows = await db.insert(comments).values(postRows.map((p, i) => ({
  postId: p.id, authorId: volunteers[(i + 2) % volunteers.length]!.id, content: 'Count me in!',
}))).returning();
await db.insert(postLikes).values(postRows.flatMap((p, i) =>
  [i, i + 1, i + 2].map((v) => ({ postId: p.id, userId: volunteers[v % volunteers.length]!.id }))));
await db.insert(commentLikes).values(commentRows.map((c, i) => ({ commentId: c.id, userId: volunteers[(i + 5) % volunteers.length]!.id })));

// Friends: dan–eve and dan–finn are accepted; gia has a pending request to dan.
const [dan, eve, finn, gia] = volunteers as [typeof volunteers[0], typeof volunteers[0], typeof volunteers[0], typeof volunteers[0]];
await db.insert(friendRequests).values([
  { senderId: dan.id, receiverId: eve.id, status: 'accepted' },
  { senderId: finn.id, receiverId: dan.id, status: 'accepted' },
  { senderId: gia.id, receiverId: dan.id, status: 'pending' },
]);
// One row per pair, smaller id first.
await db.insert(friendships).values([[dan.id, eve.id], [dan.id, finn.id]]
  .map(([a, b]) => (a! < b! ? { userLow: a!, userHigh: b! } : { userLow: b!, userHigh: a! })));

await db.insert(notifications).values([
  { userId: dan.id, actorId: managers[0]!.id, type: 'event_updated', title: 'Riverside Clean-up', body: 'The meeting point has moved to the east gate.' },
  { userId: dan.id, actorId: gia.id, type: 'friend_request_received', title: 'New friend request', body: 'Demo Gia wants to be friends.' },
]);
await db.insert(reports).values({
  reporterId: eve.id, targetId: postRows[1]!.id, targetType: 'post', reason: 'spam', description: 'Demo report for the admin queue.',
});

console.log(`Seeded ${managers.length + volunteers.length + (append ? 0 : 1)} accounts, ${eventRows.length} events.`);
if (!append) console.log(`Password for every account: ${password}`);
if (!append) console.log('Admin: demo-admin@demo.volunteerhub.test');
console.log('Managers: demo-ava@, demo-ben@, demo-chloe@demo.volunteerhub.test');
console.log('Volunteers: demo-dan@ ... demo-omar@demo.volunteerhub.test');
await closeDb();
