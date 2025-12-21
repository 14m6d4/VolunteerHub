
import { Router } from 'express';
import { updateProfileSecure, banUser, unbanUser, getPublicProfile, searchUsers, addFriend, reportUser, sendFriendRequest, acceptFriendRequest, listFriendRequests, listFriends, friendRelations, unfriendUser, adminSearchUsersController, getBannedUsersController, createUserController, deleteUserController, updateUserController, getFriendSuggestions, getUserStats, getUserEvents, getUserFriendsList, listSentFriendRequests, cancelFriendRequest, rejectFriendRequest } from '../controllers/user.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import validateBody from '../middlewares/validation.middleware.ts';
import * as validators from '../utils/validators.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';
import { UserRole } from '../types/user.ts';

const router = Router();


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


router.get('/search/query', searchUsers as any);

router.get('/friends', authMiddleware, listFriends as any);
router.get('/friends/suggestions', authMiddleware, getFriendSuggestions as any);
router.get('/friends/requests', authMiddleware, listFriendRequests as any);
router.get('/friends/sent', authMiddleware, listSentFriendRequests as any);
router.post('/friends/request', authMiddleware, sendFriendRequest as any);
router.post('/friends/accept', authMiddleware, acceptFriendRequest as any);
router.post('/friends/reject', authMiddleware, rejectFriendRequest as any);
router.post('/friends/cancel', authMiddleware, cancelFriendRequest as any);
router.post('/friends/status', authMiddleware, friendRelations as any);
router.post('/friends/add', authMiddleware, addFriend as any);
router.post('/friends/remove', authMiddleware, unfriendUser as any);

router.post('/report-user', authMiddleware, reportUser as any);

router.get('/admin/search', authMiddleware, adminSearchUsersController as any);
router.get('/admin/banned', authMiddleware, getBannedUsersController as any);
router.post('/admin/ban/:id', authMiddleware, banUser as any);
router.post('/admin/unban/:id', authMiddleware, unbanUser as any);
router.post('/admin/create', authMiddleware, createUserController as any);
router.put('/admin/:id', authMiddleware, updateUserController as any);
router.delete('/admin/:id', authMiddleware, deleteUserController as any);
router.get('/:username/stats', getUserStats as any);
router.get('/:username/events', getUserEvents as any);
router.get('/:username/friends', getUserFriendsList as any);
router.get('/:username', getPublicProfile as any);
export default router;