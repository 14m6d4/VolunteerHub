import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { notifications, users } from '../db/schema.ts';
import { NotificationType } from '../types/notification.ts';
import AppError from '../utils/appError.ts';
import { ModerationService, type ModerationTarget } from './moderation.service.ts';
import { isUuid, toLean } from '../utils/user.util.ts';

/** Row -> the shape the API has always returned (see toUser): `user` and `actor` are ids, or a populated actor. */
const toNotification = (row: typeof notifications.$inferSelect, actor?: unknown) => {
	const { userId, actorId, ...rest } = row;
	return { ...toLean(rest), user: userId, ...(actorId ? { actor: actor ?? actorId } : {}) };
};

/** Who hears about it: one user, a list of users, every admin, or the moderators of an event (GLOSSARY.md: Moderator). */
export type Audience = { userId: string } | { userIds: string[] } | 'admins' | { moderatorsOf: ModerationTarget };

type EventData = { eventId: string; eventTitle: string };
type ReportOutcome = { reportId: string; targetType: string; targetId: string; eventId?: string; postId?: string };
type PostData = { postId: string; userId: string; actorName: string | null; eventId: string | null };

/** Title and body for each kind; callers pass only the kind and the data its wording needs. */
const wording = {
	[NotificationType.EVENT_PENDING]: (d: EventData) =>
		['Event Pending Approval', `New event ${d.eventTitle} is pending your approval`],
	[NotificationType.EVENT_APPROVED]: (d: EventData) =>
		['Event Approved', `Your event ${d.eventTitle} has been approved`],
	[NotificationType.EVENT_UPDATED]: (d: EventData) =>
		['Event Updated', `Event ${d.eventTitle} just got updated`],
	[NotificationType.EVENT_COMPLETED]: (d: EventData) =>
		['Event Completed', `Event ${d.eventTitle} has been marked as completed. Thank you for your participation!`],
	[NotificationType.REGISTRATION_PENDING]: (d: EventData & { volunteerName: string; registrationId: string; url: string }) =>
		['New Registration Request', `${d.volunteerName} has registered for event "${d.eventTitle}"`],
	[NotificationType.EVENT_JOINED]: (d: EventData & { url: string }) =>
		['Registration Approved', `You have joined event ${d.eventTitle}`],
	[NotificationType.REGISTRATION_REJECTED]: (d: EventData) =>
		['Registration Rejected', `Your registration for event ${d.eventTitle} was rejected`],
	[NotificationType.EVENT_KICKED]: (d: EventData) =>
		['You have been removed from the event', `You have been removed from event ${d.eventTitle}`],
	[NotificationType.EVENT_REPORTED]: (d: EventData & { reason: string; reportId: string }) =>
		['Event Reported', `Event ${d.eventTitle} has been reported for the following reason: ${d.reason}`],
	[NotificationType.USER_REPORTED]: (d: { username: string; reason: string; targetUserId: string; reportId: string }) =>
		['User Reported', `User ${d.username} has been reported. Reason: ${d.reason}`],
	[NotificationType.POST_REPORTED]: (d: { reason: string; postId: string; eventId: string | null; reportId: string }) =>
		['Post Reported', `Post has been reported for the following reason: ${d.reason}`],
	[NotificationType.REPORT_RESOLVED]: (_d: ReportOutcome) =>
		['Report Resolved', 'Your report has been resolved. Action has been taken.'],
	[NotificationType.REPORT_REJECTED]: (_d: ReportOutcome) =>
		['Report Rejected', 'Your report has been reviewed and rejected.'],
	[NotificationType.POST_LIKED]: (d: PostData) =>
		['Post Liked', `${d.actorName} liked your post`],
	[NotificationType.POST_COMMENTED]: (d: PostData & { commentId: string; preview: string }) =>
		['New Comment', `${d.actorName} commented on your post: "${d.preview}"`],
	[NotificationType.FRIEND_REQUEST_RECEIVED]: (_d: { senderId: string }) =>
		['New friend request', 'You received a friend request'],
	[NotificationType.FRIEND_REQUEST_ACCEPTED]: (_d: { by: string }) =>
		['Friend request accepted', 'Your friend request was accepted'],
} satisfies Partial<Record<NotificationType, (d: any) => [string, string]>>;

type Kind = keyof typeof wording;

async function recipientsOf(audience: Audience) {
	if (audience === 'admins') return ModerationService.adminIds();
	if ('userId' in audience) return [audience.userId];
	if ('userIds' in audience) return audience.userIds;
	return ModerationService.moderatorIds(audience.moderatorsOf);
}

/**
 * The one way to notify. Resolves the audience, drops duplicates and the actor,
 * and writes every row in one insert. Call it after the triggering transaction
 * commits; it never throws, so a failure never fails the action.
 */
export async function notify<K extends Kind>(
	audience: Audience, kind: K, data: Parameters<(typeof wording)[K]>[0], actorId?: string,
) {
	try {
		const candidates = [...new Set(await recipientsOf(audience))].filter((id) => id !== actorId);
		if (!candidates.length) return;
		// Preferences: notifications off means none at all; event updates off mutes only edits.
		const ids = (await db.select({ id: users.id }).from(users).where(and(
			inArray(users.id, candidates),
			eq(users.notificationsEnabled, true),
			kind === NotificationType.EVENT_UPDATED ? eq(users.notifyOnEventUpdate, true) : undefined,
		))).map((u) => u.id);
		if (!ids.length) return;
		const [title, body] = (wording[kind] as (d: typeof data) => [string, string])(data);
		await db.insert(notifications).values(ids.map((userId) => ({
			userId, actorId: actorId ?? null, type: kind, title, body, data,
		})));
	} catch (err) {
		console.error(`[notify] ${kind} failed: ${(err as Error).message}`);
	}
}

export async function getNotificationsForUser(userId: string, opts: { skip?: number; limit?: number } = {}) {
	const skip = opts.skip || 0;
	const limit = Math.min(opts.limit || 20, 100);
	const rows = await db.select({
		notification: notifications,
		actor: { id: users.id, name: users.name, username: users.username, profilePicture: users.profilePicture },
	}).from(notifications)
		.leftJoin(users, eq(users.id, notifications.actorId))
		.where(eq(notifications.userId, userId))
		.orderBy(desc(notifications.createdAt), desc(notifications.id))
		.limit(limit).offset(skip);
	return rows.map((r) => toNotification(r.notification, r.actor?.id ? toLean(r.actor) : undefined));
}

export async function countUnreadNotifications(userId: string) {
	return db.$count(notifications, and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function markAsRead(notificationId: string, userId: string) {
	const [row] = isUuid(notificationId)
		? await db.update(notifications).set({ isRead: true, updatedAt: new Date() })
			.where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))).returning()
		: [];
	if (!row) throw new AppError('Notification not found', 404);
	return toNotification(row);
}

export async function markAllRead(userId: string) {
	await db.update(notifications).set({ isRead: true, updatedAt: new Date() })
		.where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
	return true;
}

export async function deleteNotification(notificationId: string, userId: string) {
	const [row] = isUuid(notificationId)
		? await db.delete(notifications)
			.where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))).returning()
		: [];
	if (!row) throw new AppError('Notification not found', 404);
	return toNotification(row);
}

export async function deleteAllNotifications(userId: string) {
	await db.delete(notifications).where(eq(notifications.userId, userId));
	return true;
}
