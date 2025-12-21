// backend/routes/user.routes.ts
import { Router } from 'express';
import { updateProfileSecure, banUser, unbanUser, getPublicProfile, searchUsers, addFriend, reportUser, sendFriendRequest, acceptFriendRequest, listFriendRequests, listFriends, friendRelations, unfriendUser, adminSearchUsersController, getBannedUsersController, createUserController, deleteUserController, updateUserController, getFriendSuggestions, getUserStats, getUserEvents, getUserFriendsList, listSentFriendRequests, cancelFriendRequest } from '../controllers/user.controller.ts';
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
router.get('/search/query', searchUsers as any);

// Friendship endpoints
router.get('/friends', authMiddleware, listFriends as any);
router.get('/friends/suggestions', authMiddleware, getFriendSuggestions as any);
router.get('/friends/requests', authMiddleware, listFriendRequests as any);
router.get('/friends/sent', authMiddleware, listSentFriendRequests as any);
router.post('/friends/request', authMiddleware, sendFriendRequest as any);
router.post('/friends/accept', authMiddleware, acceptFriendRequest as any);
router.post('/friends/cancel', authMiddleware, cancelFriendRequest as any);
router.post('/friends/status', authMiddleware, friendRelations as any);
router.post('/friends/add', authMiddleware, addFriend as any);
router.post('/friends/remove', authMiddleware, unfriendUser as any);

// Report user
router.post('/report-user', authMiddleware, reportUser as any);

// Admin Routes (Search & Ban management)
router.get('/admin/search', authMiddleware, adminSearchUsersController as any);
router.get('/admin/banned', authMiddleware, getBannedUsersController as any);
router.post('/admin/ban/:id', authMiddleware, banUser as any);
router.post('/admin/unban/:id', authMiddleware, unbanUser as any);

// NEW: Full CRUD for admin management
router.post('/admin/create', authMiddleware, createUserController as any);
router.put('/admin/:id', authMiddleware, updateUserController as any);
router.delete('/admin/:id', authMiddleware, deleteUserController as any);

// NEW: Get user statistics by username (must be before /:username)
router.get('/:username/stats', getUserStats as any);
router.get('/:username/events', getUserEvents as any);
router.get('/:username/friends', getUserFriendsList as any);

// NEW: Lấy thông tin công khai theo username (catch-all, keep last)
router.get('/:username', getPublicProfile as any);
export default router;