import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { notifications, users } from '../db/schema.ts';
import { NotificationType } from '../types/notification.ts';
import { WebPushService } from "./webpush.service.ts";
import AppError from '../utils/appError.ts';
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

		try {
			await WebPushService.sendToUser(userId, {
				title,
				body,
				data
			});
		} catch (error) {
			console.error(`[NotificationService] WebPush failed for user ${userId}:`, error);
		}
	}
};
