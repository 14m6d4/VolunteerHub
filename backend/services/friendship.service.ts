import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import AppError from '../utils/appError.ts';
import { db } from '../db/client.ts';
import { friendRequests, friendships, users } from '../db/schema.ts';
import { notify } from './notification.service.ts';
import { NotificationType } from '../types/notification.ts';
import { isUniqueViolation, isUuid, toLean } from '../utils/user.util.ts';

/** A friend's public fields. */
const FRIEND_COLUMNS = { id: users.id, username: users.username, name: users.name, profilePicture: users.profilePicture };

/** A friendship is stored once, smaller id first. */
const friendPair = (a: string, b: string) => {
  [a, b] = [a.toLowerCase(), b.toLowerCase()]; // isUuid accepts uppercase; the stored order is lowercase
  return a < b ? { userLow: a, userHigh: b } : { userLow: b, userHigh: a };
};

/** The other side of each of the user's friendships. */
const otherSide = (userId: string) =>
  sql<string>`case when ${friendships.userLow} = ${userId} then ${friendships.userHigh} else ${friendships.userLow} end`;

const involving = (userId: string) => or(eq(friendships.userLow, userId), eq(friendships.userHigh, userId));

const userExists = async (id: string) => isUuid(id) && (await db.$count(users, eq(users.id, id))) > 0;

export async function areFriends(a: string, b: string) {
  if (!isUuid(a) || !isUuid(b)) return false;
  const pair = friendPair(a, b);
  return (await db.$count(friendships, and(eq(friendships.userLow, pair.userLow), eq(friendships.userHigh, pair.userHigh)))) > 0;
}

/** The user's friends' ids, in the order they became friends. */
export async function friendIdsOf(userId: string) {
  if (!isUuid(userId)) return [];
  const rows = await db.select({ id: otherSide(userId) }).from(friendships)
    .where(involving(userId)).orderBy(asc(friendships.createdAt));
  return rows.map((r) => r.id);
}

/** The user's friends, in the order they became friends, as {_id, username, name, profilePicture[, role]}. */
export async function listFriends(userId: string, withRole = false) {
  const columns = (withRole ? { ...FRIEND_COLUMNS, role: users.role } : FRIEND_COLUMNS) as typeof FRIEND_COLUMNS & { role: typeof users.role };
  const rows = await db.select(columns).from(friendships)
    .innerJoin(users, sql`${users.id} = ${otherSide(userId)}`)
    .where(involving(userId)).orderBy(asc(friendships.createdAt), asc(users.id));
  return rows.map((r) => toLean(r));
}

export const countFriends = (userId: string) => db.$count(friendships, involving(userId));

export const removeFriend = async (userId: string, friendId: string) => {
  if (userId === friendId) throw new AppError('Cannot remove yourself', 400);

  const pair = friendPair(userId, friendId);
  const removed = isUuid(friendId)
    ? await db.delete(friendships)
      .where(and(eq(friendships.userLow, pair.userLow), eq(friendships.userHigh, pair.userHigh)))
      .returning({ userLow: friendships.userLow })
    : [];
  if (!removed.length) throw new AppError('Not friends', 400);
};

/** Row -> the shape the API has always returned: sender/receiver are ids, or populated users. */
const toFriendRequest = (row: typeof friendRequests.$inferSelect, populated?: { sender?: unknown; receiver?: unknown }) => {
  const { senderId, receiverId, ...rest } = row;
  return { ...toLean(rest), sender: senderId, receiver: receiverId, ...populated };
};

const getRequestRow = async (requestId: string) => {
  if (!isUuid(requestId)) return undefined;
  const [row] = await db.select().from(friendRequests).where(eq(friendRequests.id, requestId));
  return row;
};

export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  if (senderId === receiverId) throw new AppError('Cannot add yourself', 400);

  if (!(await userExists(receiverId))) throw new AppError('User not found', 404);
  if (await areFriends(senderId, receiverId)) throw new AppError('Already friends', 400);

  const [existing] = await db.select().from(friendRequests)
    .where(and(eq(friendRequests.senderId, senderId), eq(friendRequests.receiverId, receiverId)));
  if (existing) {
    if (existing.status === 'pending') throw new AppError('Request already sent', 400);
    await db.delete(friendRequests).where(eq(friendRequests.id, existing.id));
  }

  let created;
  try {
    [created] = await db.insert(friendRequests).values({ senderId, receiverId }).returning();
  } catch (err) {
    // Two clicks at once: the unique (sender, receiver) pair lets only one through.
    if (isUniqueViolation(err)) throw new AppError('Request already sent', 400);
    throw err;
  }

  await notify({ userId: receiverId }, NotificationType.FRIEND_REQUEST_RECEIVED, { senderId }, senderId);

  return toFriendRequest(created!);
};

export const acceptFriendRequest = async (requestId: string, currentUserId: string) => {
  const request = await getRequestRow(requestId);

  if (!request || request.receiverId !== currentUserId) {
    throw new AppError('Request not found or unauthorized', 404);
  }

  if (request.status !== 'pending') {
    throw new AppError('Request is no longer pending', 400);
  }

  await db.transaction(async (tx) => {
    const accepted = await tx.update(friendRequests)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(and(eq(friendRequests.id, request.id), eq(friendRequests.status, 'pending')))
      .returning({ id: friendRequests.id });
    if (!accepted.length) throw new AppError('Request is no longer pending', 400);
    await tx.insert(friendships).values(friendPair(request.senderId, request.receiverId)).onConflictDoNothing();
  });

  await notify({ userId: request.senderId }, NotificationType.FRIEND_REQUEST_ACCEPTED, { by: currentUserId }, currentUserId);
};

export const cancelFriendRequest = async (userId: string, requestId: string) => {
  const request = await getRequestRow(requestId);
  if (!request) throw new AppError('Friend request not found', 404);
  if (request.senderId !== userId) throw new AppError('Unauthorized to cancel this request', 403);
  if (request.status !== 'pending') throw new AppError('Can only cancel pending requests', 400);

  await db.delete(friendRequests).where(eq(friendRequests.id, request.id));
  return { message: 'Friend request cancelled successfully' };
};

export const rejectFriendRequest = async (userId: string, requestId: string) => {
  const request = await getRequestRow(requestId);
  if (!request) throw new AppError('Friend request not found', 404);
  if (request.receiverId !== userId) throw new AppError('Unauthorized to reject this request', 403);
  if (request.status !== 'pending') throw new AppError('Can only reject pending requests', 400);

  await db.delete(friendRequests).where(eq(friendRequests.id, request.id));
  return { message: 'Friend request rejected successfully' };
};

export const listIncomingFriendRequests = async (userId: string) => {
  const rows = await db.select({ request: friendRequests, sender: FRIEND_COLUMNS }).from(friendRequests)
    .innerJoin(users, eq(users.id, friendRequests.senderId))
    .where(and(eq(friendRequests.receiverId, userId), eq(friendRequests.status, 'pending')))
    .orderBy(asc(friendRequests.createdAt), asc(friendRequests.id));
  return rows.map((r) => toFriendRequest(r.request, { sender: toLean(r.sender) }));
};

export const listOutgoingFriendRequests = async (userId: string) => {
  const rows = await db.select({ request: friendRequests, receiver: FRIEND_COLUMNS }).from(friendRequests)
    .innerJoin(users, eq(users.id, friendRequests.receiverId))
    .where(and(eq(friendRequests.senderId, userId), eq(friendRequests.status, 'pending')))
    .orderBy(asc(friendRequests.createdAt), asc(friendRequests.id));
  return rows.map((r) => toFriendRequest(r.request, { receiver: toLean(r.receiver) }));
};

/** How each target relates to the user: friends, pending_sent, pending_received or none. */
export const relationsTo = async (userId: string, targets: string[]) => {
  const friendSet = new Set(await friendIdsOf(userId));
  const ids = targets.filter(isUuid);

  const pending = ids.length ? await db.select().from(friendRequests).where(and(
    eq(friendRequests.status, 'pending'),
    or(
      and(eq(friendRequests.senderId, userId), inArray(friendRequests.receiverId, ids)),
      and(eq(friendRequests.receiverId, userId), inArray(friendRequests.senderId, ids)),
    ),
  )) : [];

  const map: Record<string, string> = {};
  for (const t of targets) map[t] = friendSet.has(t) ? 'friends' : 'none';

  for (const p of pending) {
    if (p.senderId === userId) map[p.receiverId] = 'pending_sent';
    if (p.receiverId === userId) map[p.senderId] = 'pending_received';
  }

  return map;
};

// Candidates are everyone who is not an admin, banned, inactive, yourself or already a friend,
// ranked by friends in common. ponytail: scans every friendship per call; index or cache if that grows.
export const friendSuggestions = async (userId: string, limit: number = 10) => {
  const rows = await db.execute<{ id: string; username: string; name: string; profilePicture: string | null; mutualFriends: number }>(sql`
    with edges as (
      select user_low as a, user_high as b from friendships
      union all
      select user_high, user_low from friendships
    ), mine as (select b as id from edges where a = ${userId})
    select u.id, u.username, u.name, u.profile_picture as "profilePicture",
      (select count(*)::int from edges e where e.a = u.id and e.b in (select id from mine)) as "mutualFriends"
    from users u
    where u.id <> ${userId} and u.id not in (select id from mine)
      and u.role <> 'admin' and u.is_active and not u.is_banned
    order by "mutualFriends" desc, u.created_at desc, u.id
    limit ${limit}`);
  return rows.map(toLean);
};
