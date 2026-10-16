import { Router } from 'express';
import * as c from '../controllers/friendship.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';

// Mounted at /api/users/friends, ahead of the user router's /:username routes.
const router = Router();

router.get('/', authMiddleware, c.listFriends as any);
router.get('/suggestions', authMiddleware, c.getFriendSuggestions as any);
router.get('/requests', authMiddleware, c.listFriendRequests as any);
router.get('/sent', authMiddleware, c.listSentFriendRequests as any);
router.post('/request', authMiddleware, c.sendFriendRequest as any);
router.post('/accept', authMiddleware, c.acceptFriendRequest as any);
router.post('/reject', authMiddleware, c.rejectFriendRequest as any);
router.post('/cancel', authMiddleware, c.cancelFriendRequest as any);
router.post('/status', authMiddleware, c.friendRelations as any);
router.post('/add', authMiddleware, c.addFriend as any);
router.post('/remove', authMiddleware, c.unfriendUser as any);

export default router;
