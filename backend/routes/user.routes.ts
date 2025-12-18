// backend/routes/user.routes.ts
import { Router } from 'express';
import { updateProfileSecure, banUser, unbanUser, getPublicProfile, searchUsers, addFriend, reportUser, sendFriendRequest, acceptFriendRequest, listFriendRequests, listFriends, friendRelations } from '../controllers/user.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import validateBody from '../middlewares/validation.middleware.ts';
import * as validators from '../utils/validators.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';
import { UserRole } from '../types/user.ts';

const router = Router();

// Existing secure update
// Explicit preflight handler to satisfy browser OPTIONS checks for PATCH
router.options('/profile/secure', (req, res) => {
  const origin = (req.headers.origin as string) || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  return res.sendStatus(204);
});
router.patch(
  '/profile/secure',
  authMiddleware,
  validateBody(validators.secureUpdateProfileSchema),
  updateProfileSecure as any
);

// Search users
router.get('/search/query', authMiddleware, searchUsers as any);

// Friendship endpoints
router.get('/friends', authMiddleware, listFriends as any);
router.get('/friends/requests', authMiddleware, listFriendRequests as any);
router.post('/friends/request', authMiddleware, sendFriendRequest as any);
router.post('/friends/accept', authMiddleware, acceptFriendRequest as any);
router.post('/friends/status', authMiddleware, friendRelations as any);
router.post('/friends/add', authMiddleware, addFriend as any);

// Report user
router.post('/report-user', authMiddleware, reportUser as any);

// NEW: Lấy thông tin công khai theo username (catch-all, keep last)
router.get('/:username', getPublicProfile as any);
export default router;