// backend/routes/user.routes.ts
import { Router } from 'express';
import { updateProfileSecure, banUser, unbanUser } from '../controllers/user.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import validateBody from '../middlewares/validation.middleware.ts';
import * as validators from '../utils/validators.ts';
import { getPublicProfile } from '../controllers/user.controller.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';
import { UserRole } from '../types/user.ts';

const router = Router();

// Existing secure update
router.patch(
  '/profile/secure',
  authMiddleware,
  validateBody(validators.secureUpdateProfileSchema),
  updateProfileSecure as any
);

// NEW: Lấy thông tin công khai theo username
router.get('/:username', getPublicProfile);

// Admin: ban / unban
router.patch('/:id/ban', authMiddleware, roleMiddleware([UserRole.Admin]), banUser as any);
router.patch('/:id/unban', authMiddleware, roleMiddleware([UserRole.Admin]), unbanUser as any);

export default router;