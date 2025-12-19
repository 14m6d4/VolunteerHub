// backend/services/auth.service.ts

import { type ITokenPayload, type IUserDocument, UserRole, type ILoginDTO, type IRegisterDTO } from '../types/user.ts'; 
import { createAccessToken, createRefreshToken } from '../utils/jwt.util.ts';
import AppError from '../utils/appError.ts'; 
import User from '../models/User.model.ts'; 
import { generateOTP, getOTPExpiration } from '../utils/otp.util.ts';
import { sendVerificationEmail, sendResetPasswordEmail } from './email.service.ts';

// Interface for the successful response after login
interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

/**
 * Handles the user login process using EITHER email OR username.
 */
export async function loginUser(data: ILoginDTO): Promise<IAuthResponse> {
  const { email, username, password } = data; 

  if (!email && !username) {
    throw new AppError('Must provide either email or username to log in.', 400); 
  }
  
  // FIX: Thay thế FilterQuery bằng kiểu object đơn giản
  let query: object; 

  if (email) {
    // Tạo object truy vấn bằng email
    query = { email: email! }; 
  } else {
    // Tạo object truy vấn bằng username
    query = { username: username! };
  }

  // Find user (TypeScript chấp nhận 'query' là object)
  const user: IUserDocument | null = await User.findOne(query).select('+passwordHash'); 

  // Check if user exists or if password is correct
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email/username or password.', 401); 
  }
  
  // Check if user is verified
  if (!user.isVerified) {
    throw new AppError('Account is not verified. Please verify your email before logging in.', 403);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is inactive. Please contact support.', 403);
  }

  // Check if user is banned
  if ((user as any).isBanned || (((user as any).bannedUntil) && ((user as any).bannedUntil as Date) > new Date())) {
    const reason = (user as any).bannedReason || '';
    const until = (user as any).bannedUntil ? ((user as any).bannedUntil as Date).toISOString() : undefined;
    let message = 'Account is banned.';
    if (reason) message += ` Reason: ${reason}.`;
    if (until) message += ` Until: ${until}.`;
    throw new AppError(message, 403);
  }

  // 2. Create JWT Payload
  const payload: ITokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  // 3. Generate tokens
  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

  // 4. Return response
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: (user.name as string) || user.username,
    },
  };
}

/**
 * Registers a new user with default Volunteer role.
 * @param data - User registration details
 * @returns The newly created user document
 */
export async function registerUser(data: IRegisterDTO): Promise<IUserDocument> {
  const { username, email, password, birthdate, role, name } = data;

  // 1. Check if email or username already exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new AppError('Email or username already in use.', 409); // Conflict
  }

  const otpCode = generateOTP();
  const otpExpiresAt = getOTPExpiration(10);
  
  // 2. Create the user object
  const createData: any = {
    username,
    email,
    passwordHash: password, // Mongoose hook handles hashing
    birthdate,
    role: role || UserRole.Volunteer,
    isVerified: false,
    otp: otpCode,
    otpExpiresAt: otpExpiresAt,
  }

  if (name) createData.name = name

  const newUserDoc = await User.create(createData) as unknown as IUserDocument;

  sendVerificationEmail(newUserDoc, otpCode);

  // Prepare response (remove passwordHash)
  const userResponse = (newUserDoc as any).toObject();
  delete userResponse.passwordHash;
  delete userResponse.otp;
  delete userResponse.otpExpiresAt;

  // TODO: Implement email verification logic here

  return userResponse as IUserDocument;
}

/**
 * Verifies the OTP code and activates the user account.
 * @param email - User's email
 * @param otp - The OTP code received by the user
 * @returns The verified user document
 */
export async function verifyUserOTP(email: string, otp: string): Promise<IUserDocument> {
  // 1. Find user, ensure to select OTP fields
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt');

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.isVerified) {
    throw new AppError('Account is already verified.', 400);
  }

  // 2. Check Expiration
  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    // TODO: Nên tạo lại OTP mới ở đây nếu cần
    throw new AppError('OTP has expired or is invalid. Please request a new one.', 400);
  }

  // 3. Check OTP Match
  if (user.otp !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }

  // 4. Verification Successful: Update status and clear OTP fields
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save(); 

  return user;
}

/**
 * Send a password reset OTP to the user's email if the account exists.
 * For security, this function does not reveal whether the email exists to callers.
 */
export async function sendPasswordResetOtp(email: string): Promise<void> {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt');

  if (!user) {
    // Do not reveal that the email does not exist. Just return.
    return;
  }

  const otpCode = generateOTP();
  const otpExpiresAt = getOTPExpiration(10);

  user.otp = otpCode;
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  // Send email (log failures internally)
  await sendResetPasswordEmail(user, otpCode);
}

/**
 * Verify reset OTP without changing account verification status.
 */
export async function verifyPasswordResetOtp(email: string, otp: string): Promise<void> {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt');
  if (!user) throw new AppError('User not found.', 404);

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('OTP has expired or is invalid. Please request a new one.', 400);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }

  // Keep OTP fields intact until password is reset; simply return success
  return;
}

/**
 * Reset user's password using email + otp + new password.
 */
export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<IUserDocument> {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt +passwordHash');
  if (!user) throw new AppError('User not found.', 404);

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('OTP has expired or is invalid. Please request a new one.', 400);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }

  // Set new password (pre-save hook will hash it)
  user.passwordHash = newPassword as any;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  // Return sanitized user
  const sanitized: any = user.toObject();
  delete sanitized.passwordHash;
  delete sanitized.otp;
  delete sanitized.otpExpiresAt;
  return sanitized as IUserDocument;
}

/**
 * Retrieves the current authenticated user.
 */
export async function getAuthenticatedUser(userId: string): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
}