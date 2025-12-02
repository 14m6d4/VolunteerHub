// backend/routes/auth.routes.ts

import express, { type Request, type Response } from 'express';
import * as authController from '../controllers/auth.controller.ts';
import validateBody from '../middlewares/validation.middleware.ts';
import * as validators from '../utils/validators.ts';

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @description User login (local strategy)
 * @access Public
 */
router.post(
  '/login',
  validateBody(validators.loginSchema),
  authController.login
);

/**
 * @route POST /api/auth/register
 * @description User registration (Volunteer/Manager)
 * @access Public
 */
router.post(
  '/register',
  validateBody(validators.registerSchema),
  authController.register // FIX: Gán hàm controller thực tế
);

/**
 * @route POST /api/auth/verify-otp
 * @description Verify OTP code sent during registration
 * @access Public
 */
router.post(
  '/verify-otp',
  // TODO: Validation middleware cho email và otp
  authController.verifyOTP 
);

// Forgot password - send reset OTP
router.post(
  '/forgot-password',
  // TODO: add validation for { email }
  authController.forgotPassword
);

// Verify reset OTP (password reset flow)
router.post(
  '/verify-reset-otp',
  // TODO: add validation for { email, otp }
  authController.verifyResetOTP
);

// Reset password using email + otp + new password
router.post(
  '/reset-password',
  // TODO: add validation for { email, otp, password }
  authController.resetPassword
);

export default router;