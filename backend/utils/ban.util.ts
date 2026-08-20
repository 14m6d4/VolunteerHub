import { type IUserDocument } from '../types/user.ts';

/**
 * A user is banned if the flag is set, or if a temporary ban has not expired.
 * Three call sites decide this (login, Google callback, authMiddleware), so the
 * predicate lives here rather than being re-derived - and slightly differently -
 * in each of them.
 */
export function isBanned(user: Pick<IUserDocument, 'isBanned' | 'bannedUntil'> | any): boolean {
  if (user?.isBanned) return true;
  return Boolean(user?.bannedUntil && new Date(user.bannedUntil) > new Date());
}

export function banMessage(user: any): string {
  let message = 'Account is banned.';
  if (user?.bannedReason) message += ` Reason: ${user.bannedReason}.`;
  if (user?.bannedUntil) message += ` Until: ${new Date(user.bannedUntil).toISOString()}.`;
  return message;
}
