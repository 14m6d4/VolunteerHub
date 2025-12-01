// backend/utils/validators.ts

import { body, type ValidationChain } from 'express-validator'; // Use type for import
import Joi from "joi";
import { EventStatus } from "../models/Event.model";
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

export const createEventSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().allow("").optional(),
  location: Joi.string().allow("").optional(),
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().greater(Joi.ref("startAt")).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  maxMembers: Joi.number().integer().min(1).optional().allow(null),
  isPublic: Joi.boolean().optional(),
  status: Joi.string().valid(...Object.values(EventStatus)).optional()
});

export const updateEventSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().allow("").optional(),
  location: Joi.string().allow("").optional(),
  startAt: Joi.date().iso().optional(),
  endAt: Joi.date().iso().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  maxMembers: Joi.number().integer().min(1).optional().allow(null),
  isPublic: Joi.boolean().optional(),
  status: Joi.string().valid(...Object.values(EventStatus)).optional()
});
