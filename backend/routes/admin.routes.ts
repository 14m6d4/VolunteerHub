import { Router } from 'express';
import { getAnalytics } from '../controllers/admin.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';
import { UserRole } from '../types/user.ts';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware([UserRole.Admin]));

// GET /api/admin/analytics - Get analytics statistics
router.get('/analytics', getAnalytics);

export default router;
