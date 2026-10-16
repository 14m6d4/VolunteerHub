import { Router } from 'express';
import * as c from '../controllers/friendship.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { validateBody } from '../middlewares/validation.middleware.ts';
import * as v from '../utils/validators.ts';

// Mounted at /api/users/friends, ahead of the user router's /:username routes.
const router = Router();

router.get('/', authMiddleware, c.listFriends as any);
router.get('/suggestions', authMiddleware, c.getFriendSuggestions as any);
router.get('/requests', authMiddleware, c.listFriendRequests as any);
router.get('/sent', authMiddleware, c.listSentFriendRequests as any);
router.post('/request', authMiddleware, validateBody(v.sendFriendRequestSchema), c.sendFriendRequest as any);
router.post('/accept', authMiddleware, validateBody(v.friendRequestIdSchema), c.acceptFriendRequest as any);
router.post('/reject', authMiddleware, validateBody(v.friendRequestIdSchema), c.rejectFriendRequest as any);
router.post('/cancel', authMiddleware, validateBody(v.friendRequestIdSchema), c.cancelFriendRequest as any);
router.post('/status', authMiddleware, validateBody(v.friendRelationsSchema), c.friendRelations as any);
router.post('/remove', authMiddleware, validateBody(v.removeFriendSchema), c.unfriendUser as any);

export default router;
