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
  // TODO: Create authController.register function later
  (_req: Request, res: Response) => res.status(501).json({ message: 'Registration not implemented yet.' })
);

/**
 * TODO: Implement other auth routes
 * router.post('/refresh', authController.refreshToken);
 * router.get('/logout', authController.logout);
 */

export default router;