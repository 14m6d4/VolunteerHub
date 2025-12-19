import NotificationModel, { type INotification } from '../models/Notification.model.ts';
import { WebPushService } from "./webpush.service.ts";
import AppError from '../utils/appError.ts';

export async function createNotification(payload: {
	userId: string;
	actorId?: string;
	type: string;
	title: string;
	body?: string;
	data?: Record<string, any>;
}) {
	const doc = await NotificationModel.create({
		user: payload.userId,
		actor: payload.actorId,
		type: payload.type,
		title: payload.title,
		body: payload.body,
		data: payload.data,
	});
	return doc;
}

export async function getNotificationsForUser(userId: string, opts: { skip?: number; limit?: number } = {}) {
	const skip = opts.skip || 0;
	const limit = Math.min(opts.limit || 20, 100);
	const docs = await NotificationModel.find({ user: userId })
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.lean();
	return docs;
}

export async function countUnreadNotifications(userId: string) {
	return NotificationModel.countDocuments({ user: userId, isRead: false });
}

export async function markAsRead(notificationId: string, userId: string) {
	const doc = await NotificationModel.findOneAndUpdate(
		{ _id: notificationId, user: userId },
		{ isRead: true },
		{ new: true }
	);
	if (!doc) throw new AppError('Notification not found', 404);
	return doc;
}

export async function markAllRead(userId: string) {
	await NotificationModel.updateMany({ user: userId, isRead: false }, { isRead: true });
	return true;
}

export async function deleteNotification(notificationId: string, userId: string) {
	const doc = await NotificationModel.findOneAndDelete({ _id: notificationId, user: userId });
	if (!doc) throw new AppError('Notification not found', 404);
	return doc;
}

export async function deleteAllNotifications(userId: string) {
	await NotificationModel.deleteMany({ user: userId });
	return true;
}

export const NotificationService = {
	async notify(userId, { title, body, data, type }) {
		await NotificationModel.create({
			userId,
			title,
			body,
			data,
			type
		});

		await WebPushService.sendToUser(userId, {
			title,
			body,
			data
		});
	}
};
