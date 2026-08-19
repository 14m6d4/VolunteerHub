import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import * as notificationController from '../controllers/notification.controller.ts';

const router = Router();

// Protected: get notifications for authenticated user
router.get('/', authMiddleware, notificationController.listNotifications as any);
router.get('/unread/count', authMiddleware, notificationController.unreadCount as any);
router.patch('/:id/read', authMiddleware, notificationController.markRead as any);
router.patch('/mark-all-read', authMiddleware, notificationController.markAllReadController as any);
router.delete('/:id', authMiddleware, notificationController.deleteNotification as any);
router.delete('/', authMiddleware, notificationController.deleteAllNotifications as any);

// Internal/admin: create notification
router.post('/', notificationController.createNotificationController);

export default router;
