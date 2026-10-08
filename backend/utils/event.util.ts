import { eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import { db } from '../db/client.ts';
import { events, registrations } from '../db/schema.ts';
import { UserRole } from '../types/user.ts';
import { isUuid, toLean } from './user.util.ts';

export type EventRow = typeof events.$inferSelect;
export type RegistrationRow = typeof registrations.$inferSelect;
type Lean = ReturnType<typeof toLean>;

/**
 * Row -> the shape the API has always returned (see toUser): `_id` plus the
 * `id` and `isFull` virtuals the old documents serialised. maxMembers stays
 * `null` when unlimited, as it was; other unset fields are absent.
 */
export function toEvent(row: EventRow) {
  return <Lean & { id: string; isFull: boolean }>{
    ...toLean(row),
    id: row.id,
    maxMembers: row.maxMembers,
    isFull: !!row.maxMembers && row.currentMembers >= row.maxMembers,
  };
}

/** `completedAt` stays `null` until completion, as it did on the old documents. */
export function toRegistration(row: RegistrationRow) {
  return <Lean>{ ...toLean(row), completedAt: row.completedAt };
}

/**
 * A manager may only act on events they run; an admin may act on any.
 * Role alone is not enough: it proves the caller is *a* manager, never that
 * they are *this event's* manager.
 */
export function assertMayManageEvent(event: { managerId: string }, actorId: string, actorRole: string) {
  if (actorRole === UserRole.Admin) return;
  if (event.managerId !== actorId) {
    throw createHttpError(403, 'You do not manage this event');
  }
}

/** The event row, or undefined for an unknown id (a malformed id counts as unknown). */
export const getEventRow = async (eventId: string) => {
  if (!isUuid(eventId)) return undefined;
  const [row] = await db.select().from(events).where(eq(events.id, eventId));
  return row;
};
