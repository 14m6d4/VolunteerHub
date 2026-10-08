import type { users } from '../db/schema.ts';
import type { IUser } from '../types/user.ts';

export type UserRow = typeof users.$inferSelect;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres rejects a malformed uuid with an error; callers want "no such user". */
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Row -> the shape the API has always returned: `_id` instead of `id`, no
 * secrets, and absent rather than null for unset fields (what the old
 * documents did), so responses don't change.
 */
export function toUser(row: UserRow): IUser {
  const { passwordHash, otp, otpExpiresAt, ...rest } = row;
  // Old documents always carried `friends`; friendships are their own table now, so it stays empty here (see friend.util).
  return { ...toLean(rest), friends: [] } as unknown as IUser;
}

/** Same mapping for a partial select; the caller picks the columns, so no secrets to strip. */
export function toLean<T extends { id: string }>(partial: T) {
  const { id, ...rest } = partial;
  const lean: Record<string, unknown> = { _id: id };
  for (const [key, value] of Object.entries(rest)) {
    if (value !== null) lean[key] = value;
  }
  return lean as { _id: string } & Record<string, any>;
}

/** Postgres unique_violation, which drizzle wraps with the driver error as `cause`. */
export const isUniqueViolation = (err: unknown) =>
  (err as any)?.code === '23505' || (err as any)?.cause?.code === '23505';
