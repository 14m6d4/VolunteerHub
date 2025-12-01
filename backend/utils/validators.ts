// backend/utils/validators.ts

import { body, type ValidationChain } from 'express-validator'; // Use type for import

// --- Shared Validation Chains ---

const emailValidator: ValidationChain = body('email')
  .trim()
  .isEmail().withMessage('Email must be valid.')
  .normalizeEmail();

const passwordValidator: ValidationChain = body('password')
  .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.');

const usernameValidator: ValidationChain = body('username')
  .trim()
  .notEmpty().withMessage('Username is required.')
  .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters.');

// --- Exported Schemas (Arrays of Validation Chains) ---

/**
 * Validation schema for the login endpoint.
 * Requires email and password to be present and conform to basic rules.
 */
export const loginSchema: ValidationChain[] = [
  body('email').optional(), 
  body('username').optional(),
  emailValidator.optional(),
  usernameValidator.optional(),
  passwordValidator,
];

/**
 * Validation schema for the registration endpoint.
 * Requires all necessary fields including username and birthdate.
 */
export const registerSchema: ValidationChain[] = [
  emailValidator,
  passwordValidator,
  usernameValidator,
  body('birthdate')
    .isISO8601().toDate().withMessage('Birthdate must be a valid date (YYYY-MM-DD).'),
];