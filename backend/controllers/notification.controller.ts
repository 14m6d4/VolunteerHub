import { type Request, type Response, type NextFunction } from 'express';
import * as notificationService from '../services/notification.service.ts';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';

export async function listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const skip = Number(req.query.skip || 0);
    const limit = Number(req.query.limit || 20);

    const notifications = await notificationService.getNotificationsForUser(userId, { skip, limit });
    res.status(200).json({ status: 'success', data: { notifications } });
  } catch (err) {
    next(err);
  }
}

export async function unreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const count = await notificationService.countUnreadNotifications(userId);
    res.status(200).json({ status: 'success', data: { count } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const id = req.params.id;
    const doc = await notificationService.markAsRead(id, userId);
    res.status(200).json({ status: 'success', data: { notification: doc } });
  } catch (err) {
    next(err);
  }
}

export async function markAllReadController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    await notificationService.markAllRead(userId);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;
    await notificationService.deleteNotification(id, userId);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
}

export async function deleteAllNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    await notificationService.deleteAllNotifications(userId);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
}

export async function createNotificationController(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, actorId, type, title, body, data } = req.body;
    const doc = await notificationService.createNotification({ userId, actorId, type, title, body, data });
    res.status(201).json({ status: 'success', data: { notification: doc } });
  } catch (err) {
    next(err);
  }
}
