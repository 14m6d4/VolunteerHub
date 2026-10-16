
import { Router } from 'express';
import { updateProfileSecure, banUser, unbanUser, getPublicProfile, searchUsers, reportUser, adminSearchUsersController, getBannedUsersController, createUserController, deleteUserController, updateUserController, getUserStats, getUserEvents, getUserFriendsList } from '../controllers/user.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import validateBody from '../middlewares/validation.middleware.ts';
import * as validators from '../utils/validators.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';
import { UserRole } from '../types/user.ts';

const router = Router();

router.patch(
  '/profile/secure',
  authMiddleware,
  validateBody(validators.secureUpdateProfileSchema),
  updateProfileSecure as any
);


router.get('/search/query', searchUsers as any);


router.post('/report-user', authMiddleware, reportUser as any);

// Every /admin/* route below is admin-only. authMiddleware alone only proves
// the caller is signed in - without the role gate any volunteer could reach
// them, and updateUserAdminService assigns whatever fields the body carries
// (role, password included).
const adminOnly = [authMiddleware, roleMiddleware([UserRole.Admin])];

router.get('/admin/search', adminOnly, adminSearchUsersController as any);
router.get('/admin/banned', adminOnly, getBannedUsersController as any);
router.post('/admin/ban/:id', adminOnly, banUser as any);
router.post('/admin/unban/:id', adminOnly, unbanUser as any);
router.post('/admin/create', adminOnly, validateBody(validators.adminCreateUserSchema), createUserController as any);
router.put('/admin/:id', adminOnly, validateBody(validators.adminUpdateUserSchema), updateUserController as any);
router.delete('/admin/:id', adminOnly, deleteUserController as any);
router.get('/:username/stats', getUserStats as any);
router.get('/:username/events', getUserEvents as any);
router.get('/:username/friends', getUserFriendsList as any);
router.get('/:username', getPublicProfile as any);
export default router;