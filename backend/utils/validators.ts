import { z } from 'zod';
import { userRole } from '../db/schema.ts';

// --- Login Schema ---
export const loginSchema = z.object({
  email: z.string().email('Email must be valid.').optional().or(z.literal('')),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-z0-9._]+$/, 'Username may contain only lowercase letters, numbers, dot and underscore')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
}).refine(
  (data) => data.email || data.username,
  { message: 'Either email or username is required' }
);

// --- Register Schema ---
export const registerSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name too long').optional(),
  email: z.string().email('Email must be valid.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-z0-9._]+$/, 'Username may contain only lowercase letters, numbers, dot and underscore'),
  birthdate: z.string().datetime().or(z.date()),
});

// --- Event Schemas ---
// Helper for boolean coercion from FormData
const booleanString = z.union([z.boolean(), z.string()]).transform((val) => {
  if (typeof val === "boolean") return val;
  return val === "true";
});

// Helper for number coercion
const numberString = z.union([z.number(), z.string()]).transform((val) => {
  if (typeof val === "number") return val;
  if (val === "") return undefined;
  const parsed = Number(val);
  return isNaN(parsed) ? undefined : parsed;
});

// --- Event Schemas ---
export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be at most 200 characters'),
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startAt: z.string().datetime().or(z.date()),
  endAt: z.string().datetime().or(z.date()).optional(),
  tags: z.union([z.array(z.string()), z.string()]).transform(val => {
    if (Array.isArray(val)) return val;
    return [val];
    return val;
  }).pipe(z.array(z.string())).optional().default([]),
  maxMembers: z.preprocess(val => {
    if (val === 'null' || val === 'undefined' || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  }, z.number().int().min(1).nullable().optional()),
  isPublic: z.preprocess(val => val === 'true', z.boolean().optional().default(true)),
  // No status here either: createEvent spreads the payload straight into the
  // model, so accepting it let a manager create an already-approved event.
  // New events take the schema default and wait for an admin.
}).refine(
  (data) => !data.endAt || new Date(data.endAt) > new Date(data.startAt),
  { message: 'End date must be after start date', path: ['endAt'] }
);

export const updateEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be at most 200 characters').optional(),
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startAt: z.string().datetime().or(z.date()).optional(),
  endAt: z.string().datetime().or(z.date()).optional(),
  tags: z.array(z.string()).optional().default([]),
  maxMembers: z.preprocess(val => {
    if (val === 'null' || val === 'undefined' || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  }, z.number().int().min(1).nullable().optional()),
  isPublic: z.preprocess(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
  // status is deliberately absent. PATCH /events/:id/approve is admin-only, but
  // accepting status here let a manager PUT status: 'approved' onto their own
  // pending event and publish it without review. Lifecycle changes go through
  // the dedicated approve/complete/cancel routes.
}).refine(
  (data) => !data.endAt || !data.startAt || new Date(data.endAt) > new Date(data.startAt),
  { message: 'End date must be after start date', path: ['endAt'] }
);

// --- Admin User Management Schemas ---
// These two endpoints previously took req.body unvalidated into Object.assign,
// so an admin could set any field on the model, including ones the UI never
// exposes. Validation also strips unknown keys, since validateBody replaces
// req.body with the parsed result.
export const adminCreateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-z0-9._]+$/, 'Username may contain only lowercase letters, numbers, dot and underscore'),
  email: z.string().email('Email must be valid.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name too long').optional(),
  role: z.enum(userRole.enumValues).optional(),
  birthdate: z.union([z.string(), z.date()]).optional(),
});

export const adminUpdateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-z0-9._]+$/, 'Username may contain only lowercase letters, numbers, dot and underscore')
    .optional(),
  email: z.string().email('Email must be valid.').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long.').or(z.literal('')).optional(),
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name too long').optional(),
  role: z.enum(userRole.enumValues).optional(),
  isActive: z.boolean().optional(),
  birthdate: z.union([z.string(), z.date()]).optional(),
});

// --- Password Reset Schema ---
// The reset flow set a new password with no validation at all, so it was the
// one way into an account that ignored the 8-character floor above.
export const resetPasswordSchema = z.object({
  email: z.string().email('Email must be valid.'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

// --- User Profile Schema ---
export const secureUpdateProfileSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters long').optional(),
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name too long').optional(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-z0-9._]+$/, 'Username may contain only lowercase letters, numbers, dot and underscore')
    .optional(),
  // Accept either a JS Date or a YYYY-MM-DD string
  birthdate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthdate must be YYYY-MM-DD'),
    z.date()
  ]).optional(),
  // Allow a normal URL, or a data URI (base64), or empty string
  profilePicture: z.union([
    z.string().url('Must be a valid URL'),
    z.string().regex(/^data:image\/[a-zA-Z]+;base64,/, 'Invalid image data URL'),
    z.literal('')
  ]).optional(),
  // Matches the 8-character minimum enforced at registration; a lower bound
  // here let users downgrade below the floor they signed up under.
  // currentPassword above stays permissive - it verifies an existing password,
  // and tightening it would lock out accounts created before this rule.
  password: z.string().min(8, 'Password must be at least 8 characters long.').optional(),
  notificationsEnabled: z.boolean().optional(),
  notifyOnMention: z.boolean().optional(),
  notifyOnEventUpdate: z.boolean().optional(),
});

