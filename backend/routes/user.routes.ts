// backend/routes/user.routes.ts
import { Router } from 'express';
import { updateProfileSecure } from '../controllers/user.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import validateBody from '../middlewares/validation.middleware.ts';
import * as validators from '../utils/validators.ts';
import { getPublicProfile } from '../controllers/user.controller.ts';

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

export default router;