import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { commentLikes, postLikes, posts, users } from '../db/schema.ts';
import { isUuid, toLean } from './user.util.ts';

export type PostRow = typeof posts.$inferSelect;

/** The post row, or undefined for an unknown id (a malformed id counts as unknown). */
export const getPostRow = async (postId: unknown) => {
  if (!isUuid(postId)) return undefined;
  const [row] = await db.select().from(posts).where(eq(posts.id, postId));
  return row;
};

/**
 * Row -> the shape the API has always returned (see toUser). `likes` is whatever
 * the endpoint put there: user ids, or populated {_id, name, username} objects.
 */
export const toPost = (row: PostRow, likes: unknown[]) => ({ ...toLean(row), likes });

const groupBy = <T>(rows: { key: string; value: T }[]) => {
  const map = new Map<string, T[]>();
  for (const { key, value } of rows) map.set(key, [...(map.get(key) ?? []), value]);
  return map;
};

/** Who liked each post, as ids, in the order they liked. */
export async function postLikerIds(postIds: string[]) {
  if (!postIds.length) return new Map<string, string[]>();
  const rows = await db.select({ postId: postLikes.postId, userId: postLikes.userId }).from(postLikes)
    .where(inArray(postLikes.postId, postIds)).orderBy(asc(postLikes.createdAt), asc(postLikes.userId));
  return groupBy(rows.map((r) => ({ key: r.postId, value: r.userId })));
}

/** Who liked each post, as {_id, name, username}, in the order they liked. */
export async function postLikers(postIds: string[]) {
  if (!postIds.length) return new Map<string, ReturnType<typeof toLean>[]>();
  const rows = await db.select({ postId: postLikes.postId, id: users.id, name: users.name, username: users.username })
    .from(postLikes).innerJoin(users, eq(users.id, postLikes.userId))
    .where(inArray(postLikes.postId, postIds)).orderBy(asc(postLikes.createdAt), asc(users.id));
  return groupBy(rows.map(({ postId, ...liker }) => ({ key: postId, value: toLean(liker) })));
}

/** Who liked each comment, as ids, in the order they liked. */
export async function commentLikerIds(commentIds: string[]) {
  if (!commentIds.length) return new Map<string, string[]>();
  const rows = await db.select({ commentId: commentLikes.commentId, userId: commentLikes.userId }).from(commentLikes)
    .where(inArray(commentLikes.commentId, commentIds)).orderBy(asc(commentLikes.createdAt), asc(commentLikes.userId));
  return groupBy(rows.map((r) => ({ key: r.commentId, value: r.userId })));
}
