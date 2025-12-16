import NotificationModel, { type INotification } from '../models/Notification.model.ts';
import { WebPushService } from "./webpush.service.ts";
import AppError from '../utils/appError.ts';

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
	},

	async createNotification(payload: {
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
	},

	async getNotificationsForUser(userId: string, opts: { skip?: number; limit?: number } = {}) {
		const skip = opts.skip || 0;
		const limit = Math.min(opts.limit || 20, 100);
		const docs = await NotificationModel.find({ user: userId })
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();
		return docs;
	},

	async countUnreadNotifications(userId: string) {
		return NotificationModel.countDocuments({ user: userId, isRead: false });
	},

	async markAsRead(notificationId: string, userId: string) {
		const doc = await NotificationModel.findOneAndUpdate(
			{ _id: notificationId, user: userId },
			{ isRead: true },
			{ new: true }
		);
		if (!doc) throw new AppError('Notification not found', 404);
		return doc;
	},

	async markAllRead(userId: string) {
		await NotificationModel.updateMany({ user: userId, isRead: false }, { isRead: true });
		return true;
	}
};
