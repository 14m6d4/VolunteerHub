import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import * as notificationController from '../controllers/notification.controller.ts';

const router = Router();

// Protected: get notifications for authenticated user
router.get('/', authMiddleware, notificationController.listNotifications);
router.get('/unread/count', authMiddleware, notificationController.unreadCount);
router.patch('/:id/read', authMiddleware, notificationController.markRead);
router.patch('/mark-all-read', authMiddleware, notificationController.markAllReadController);
router.delete('/:id', authMiddleware, notificationController.deleteNotification);
router.delete('/', authMiddleware, notificationController.deleteAllNotifications);

// Internal/admin: create notification
router.post('/', notificationController.createNotificationController);

export default router;
