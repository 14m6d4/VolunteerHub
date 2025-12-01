// backend/routes/auth.routes.ts

import express, { type Request, type Response} from 'express';
import * as authController from '../controllers/auth.controller.ts';
import validationMiddleware from '../middlewares/validation.middleware.ts'; 
import * as validators from '../utils/validators.ts';

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @description User login (local strategy)
 * @access Public
 */
router.post(
  '/login',
  validationMiddleware(validators.loginSchema),
  authController.login
);

/**
 * @route POST /api/auth/register
 * @description User registration (Volunteer/Manager)
 * @access Public
 */
router.post(
  '/register',
  validationMiddleware(validators.registerSchema),
  authController.register // FIX: Gán hàm controller thực tế
);

export default router;