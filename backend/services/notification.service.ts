import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { notifications, users } from '../db/schema.ts';
import { NotificationType } from '../types/notification.ts';
import { UserRole } from '../types/user.ts';
import AppError from '../utils/appError.ts';
import { ModerationService, type ModerationTarget } from './moderation.service.ts';
import { isUuid, toLean } from '../utils/user.util.ts';

/** Row -> the shape the API has always returned (see toUser): `user` and `actor` are ids, or a populated actor. */
const toNotification = (row: typeof notifications.$inferSelect, actor?: unknown) => {
	const { userId, actorId, ...rest } = row;
	return { ...toLean(rest), user: userId, ...(actorId ? { actor: actor ?? actorId } : {}) };
};

export async function createNotification(payload: {
	userId: string;
	actorId?: string;
	type: NotificationType;
	title: string;
	body?: string;
	data?: Record<string, any>;
}) {
	const [row] = await db.insert(notifications).values({
		userId: payload.userId,
		actorId: payload.actorId ?? null,
		type: payload.type,
		title: payload.title,
		body: payload.body ?? null,
		data: payload.data ?? null,
	}).returning();
	return toNotification(row!);
}

/** Who hears about it: one user, every admin, or the moderators of an event (GLOSSARY.md: Moderator). */
export type Audience = { userId: string } | 'admins' | { moderatorsOf: ModerationTarget };

type EventData = { eventId: string; eventTitle: string };

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
} satisfies Partial<Record<NotificationType, (d: any) => [string, string]>>;

type Kind = keyof typeof wording;

async function recipientsOf(audience: Audience) {
	if (audience === 'admins') {
		return (await db.select({ id: users.id }).from(users).where(eq(users.role, UserRole.Admin))).map((a) => a.id);
	}
	if ('userId' in audience) return [audience.userId];
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
		const ids = [...new Set(await recipientsOf(audience))].filter((id) => id !== actorId);
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

export const NotificationService = {
	async notify(userId: string, { title, body, data, type }: any) {
		try {
			await db.insert(notifications).values({
				userId,
				title,
				body: body ?? null,
				data: data ?? null,
				type
			});
		} catch (error) {
			console.error(`[NotificationService] Failed to create notification for user ${userId}:`, error);
		}
	}
};
