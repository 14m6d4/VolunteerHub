// backend/routes/user.routes.ts

import { Router } from 'express';
// Note: Bạn cần thay đổi import trong user.controller.ts thành updateProfileSecure
import { updateProfileSecure } from '../controllers/user.controller.ts'; 
import { authMiddleware } from '../middlewares/auth.middleware.ts'; 
import validateBody from '../middlewares/validation.middleware.ts'; 
import * as validators from '../utils/validators.ts'; // Assuming validators is a barrel file

const router = Router();

/**
 * @route PATCH /api/users/profile/secure
 * @description Securely update user profile (requires current password check)
 * @access Private
 */
router.patch(
  '/profile/secure',
  authMiddleware, // Check for valid JWT
  validateBody(validators.secureUpdateProfileSchema), // Validate required fields (including currentPassword)
  updateProfileSecure as any
);

export default router;