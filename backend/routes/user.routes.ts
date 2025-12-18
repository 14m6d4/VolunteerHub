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

// NEW: Lấy thông tin công khai theo username
router.get('/:username', getPublicProfile);

// Admin: ban / unban
router.patch('/:id/ban', authMiddleware, roleMiddleware([UserRole.Admin]), banUser as any);
router.patch('/:id/unban', authMiddleware, roleMiddleware([UserRole.Admin]), unbanUser as any);

export default router;