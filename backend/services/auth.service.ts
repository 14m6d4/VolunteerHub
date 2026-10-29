import { eq, or } from 'drizzle-orm';
import { type ITokenPayload, type IUserDocument, UserRole, type ILoginDTO, type IRegisterDTO } from '../types/user.ts';
import { createAccessToken, createRefreshToken } from '../utils/jwt.util.ts';
import AppError from '../utils/appError.ts';
import { db } from '../db/client.ts';
import { users } from '../db/schema.ts';
import { generateOTP, getOTPExpiration } from '../utils/otp.util.ts';
import { isBanned, banMessage } from '../utils/ban.util.ts';
import { comparePassword, hashPassword } from '../utils/password.util.ts';
import { isUniqueViolation, normalizeEmail, toUser } from '../utils/user.util.ts';
import { DEMO_LOGIN_EMAILS, type DemoRole } from '../utils/demo.util.ts';
import { sendVerificationEmail, sendResetPasswordEmail } from './email.service.ts';
import { findUserById } from './user.service.ts';

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

const findByEmail = async (email: string) => {
  const [row] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  return row;
};

const assertOtp = (user: { otp: string | null; otpExpiresAt: Date | null }, otp: string) => {
  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('OTP has expired or is invalid. Please request a new one.', 400);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }
};

export async function loginUser(data: ILoginDTO): Promise<IAuthResponse> {
  const { email, username, password } = data;

  if (!email && !username) {
    throw new AppError('Must provide either email or username to log in.', 400);
  }

  const [row] = await db.select().from(users)
    .where(email ? eq(users.email, normalizeEmail(email)) : eq(users.username, username!));

  if (!row || !(await comparePassword(password, row.passwordHash))) {
    throw new AppError('Invalid email/username or password.', 401);
  }

  return signIn(row);
}

/** Signs in as the fixed demo account for `role`; no password, but the same checks as any login. */
export async function loginDemoUser(role: DemoRole): Promise<IAuthResponse> {
  const row = await findByEmail(DEMO_LOGIN_EMAILS[role]);
  if (!row) {
    throw new AppError('Demo account not available', 404);
  }
  return signIn(row);
}

/** What every login checks before it hands out tokens. */
function signIn(row: typeof users.$inferSelect): IAuthResponse {
  if (!row.isVerified) {
    throw new AppError('Account is not verified. Please verify your email before logging in.', 403);
  }

  if (!row.isActive) {
    throw new AppError('Account is inactive. Please contact support.', 403);
  }

  if (isBanned(row)) {
    throw new AppError(banMessage(row), 403);
  }

  const payload: ITokenPayload = {
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
  };

  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: row.id,
      email: row.email,
      role: row.role as UserRole,
      name: row.name || row.username,
    },
  };
}

/** Public sign-up is off unless SIGNUP_ENABLED is exactly 'true'. Read per request, like DISABLE_EMAIL_OTP. */
export const isSignupEnabled = () => process.env.SIGNUP_ENABLED === 'true';

export async function registerUser(data: IRegisterDTO): Promise<IUserDocument> {
  if (!isSignupEnabled()) {
    throw new AppError('Sign-up is closed', 403);
  }

  const { username, password, birthdate, role, name } = data;
  const email = normalizeEmail(data.email);

  const [existing] = await db.select({ id: users.id }).from(users)
    .where(or(eq(users.email, email), eq(users.username, username)));
  if (existing) {
    throw new AppError('Email or username already in use.', 409); // Conflict
  }

  // Temporary switch for when email can't be delivered: accounts start verified and no code is sent.
  const skipOtp = process.env.DISABLE_EMAIL_OTP === 'true';
  const otpCode = generateOTP();

  let row;
  try {
    [row] = await db.insert(users).values({
      username,
      email,
      passwordHash: await hashPassword(password),
      birthdate: new Date(birthdate),
      role: role || UserRole.Volunteer,
      isVerified: skipOtp,
      ...(skipOtp ? {} : { otp: otpCode, otpExpiresAt: getOTPExpiration(10) }),
      ...(name ? { name } : {}),
    }).returning();
  } catch (err) {
    // Two sign-ups racing past the check above land on the unique constraints.
    if (isUniqueViolation(err)) throw new AppError('Email or username already in use.', 409);
    throw err;
  }

  const user = toUser(row!);
  if (!skipOtp) sendVerificationEmail(user, otpCode);

  return user;
}

export async function verifyUserOTP(email: string, otp: string): Promise<IUserDocument> {
  const row = await findByEmail(email);

  if (!row) {
    throw new AppError('User not found.', 404);
  }

  if (row.isVerified) {
    throw new AppError('Account is already verified.', 400);
  }

  assertOtp(row, otp);

  const [verified] = await db.update(users)
    .set({ isVerified: true, otp: null, otpExpiresAt: null, updatedAt: new Date() })
    .where(eq(users.id, row.id))
    .returning();

  return toUser(verified!);
}

export async function sendPasswordResetOtp(email: string): Promise<void> {
  const row = await findByEmail(email);

  if (!row) {
    return;
  }

  const otpCode = generateOTP();

  await db.update(users)
    .set({ otp: otpCode, otpExpiresAt: getOTPExpiration(10), updatedAt: new Date() })
    .where(eq(users.id, row.id));

  await sendResetPasswordEmail(toUser(row), otpCode);
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<void> {
  const row = await findByEmail(email);
  if (!row) throw new AppError('User not found.', 404);

  assertOtp(row, otp);
}

export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<IUserDocument> {
  const row = await findByEmail(email);
  if (!row) throw new AppError('User not found.', 404);

  assertOtp(row, otp);

  const [updated] = await db.update(users)
    .set({ passwordHash: await hashPassword(newPassword), otp: null, otpExpiresAt: null, updatedAt: new Date() })
    .where(eq(users.id, row.id))
    .returning();

  return toUser(updated!);
}

export async function getAuthenticatedUser(userId: string): Promise<IUserDocument> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
}
