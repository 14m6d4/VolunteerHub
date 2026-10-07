import { and, asc, eq, or, sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { friendships, users } from '../db/schema.ts';
import { isUuid, toLean } from './user.util.ts';

/** A friendship is stored once, smaller id first. */
export const friendPair = (a: string, b: string) =>
  a < b ? { userLow: a, userHigh: b } : { userLow: b, userHigh: a };

export async function areFriends(a: string, b: string) {
  if (!isUuid(a) || !isUuid(b)) return false;
  const pair = friendPair(a, b);
  return (await db.$count(friendships, and(eq(friendships.userLow, pair.userLow), eq(friendships.userHigh, pair.userHigh)))) > 0;
}

/** The other side of each of the user's friendships. */
export const otherSide = (userId: string) =>
  sql<string>`case when ${friendships.userLow} = ${userId} then ${friendships.userHigh} else ${friendships.userLow} end`;

export const involving = (userId: string) => or(eq(friendships.userLow, userId), eq(friendships.userHigh, userId));

/** The user's friends' ids, in the order they became friends. */
export async function friendIdsOf(userId: string) {
  if (!isUuid(userId)) return [];
  const rows = await db.select({ id: otherSide(userId) }).from(friendships)
    .where(involving(userId)).orderBy(asc(friendships.createdAt));
  return rows.map((r) => r.id);
}

const FRIEND_COLUMNS = { id: users.id, username: users.username, name: users.name, profilePicture: users.profilePicture };

/** The user's friends, in the order they became friends, as {_id, username, name, profilePicture[, role]}. */
export async function listFriends(userId: string, withRole = false) {
  const columns = (withRole ? { ...FRIEND_COLUMNS, role: users.role } : FRIEND_COLUMNS) as typeof FRIEND_COLUMNS & { role: typeof users.role };
  const rows = await db.select(columns).from(friendships)
    .innerJoin(users, sql`${users.id} = ${otherSide(userId)}`)
    .where(involving(userId)).orderBy(asc(friendships.createdAt), asc(users.id));
  return rows.map((r) => toLean(r));
}
