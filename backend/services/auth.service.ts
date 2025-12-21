import { type ITokenPayload, type IUserDocument, UserRole, type ILoginDTO, type IRegisterDTO } from '../types/user.ts';
import { createAccessToken, createRefreshToken } from '../utils/jwt.util.ts';
import AppError from '../utils/appError.ts';
import User from '../models/User.model.ts';
import { generateOTP, getOTPExpiration } from '../utils/otp.util.ts';
import { sendVerificationEmail, sendResetPasswordEmail } from './email.service.ts';

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


export async function loginUser(data: ILoginDTO): Promise<IAuthResponse> {
  const { email, username, password } = data;

  if (!email && !username) {
    throw new AppError('Must provide either email or username to log in.', 400);
  }


  let query: object;

  if (email) {
    query = { email: email! };
  } else {
    query = { username: username! };
  }
  const user: IUserDocument | null = await User.findOne(query).select('+passwordHash');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email/username or password.', 401);
  }

  if (!user.isVerified) {
    throw new AppError('Account is not verified. Please verify your email before logging in.', 403);
  }

  if (!user.isActive) {
    throw new AppError('Account is inactive. Please contact support.', 403);
  }

  if ((user as any).isBanned || (((user as any).bannedUntil) && ((user as any).bannedUntil as Date) > new Date())) {
    const reason = (user as any).bannedReason || '';
    const until = (user as any).bannedUntil ? ((user as any).bannedUntil as Date).toISOString() : undefined;
    let message = 'Account is banned.';
    if (reason) message += ` Reason: ${reason}.`;
    if (until) message += ` Until: ${until}.`;
    throw new AppError(message, 403);
  }

  const payload: ITokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

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

export async function registerUser(data: IRegisterDTO): Promise<IUserDocument> {
  const { username, email, password, birthdate, role, name } = data;

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new AppError('Email or username already in use.', 409); // Conflict
  }

  const otpCode = generateOTP();
  const otpExpiresAt = getOTPExpiration(10);

  const createData: any = {
    username,
    email,
    passwordHash: password,
    birthdate,
    role: role || UserRole.Volunteer,
    isVerified: false,
    otp: otpCode,
    otpExpiresAt: otpExpiresAt,
  }

  if (name) createData.name = name

  const newUserDoc = await User.create(createData) as unknown as IUserDocument;

  sendVerificationEmail(newUserDoc, otpCode);

  const userResponse = (newUserDoc as any).toObject();
  delete userResponse.passwordHash;
  delete userResponse.otp;
  delete userResponse.otpExpiresAt;


  return userResponse as IUserDocument;
}

export async function verifyUserOTP(email: string, otp: string): Promise<IUserDocument> {
  // 1. Find user, ensure to select OTP fields
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt');

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.isVerified) {
    throw new AppError('Account is already verified.', 400);
  }

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('OTP has expired or is invalid. Please request a new one.', 400);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  return user;
}

export async function sendPasswordResetOtp(email: string): Promise<void> {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt');

  if (!user) {
    return;
  }

  const otpCode = generateOTP();
  const otpExpiresAt = getOTPExpiration(10);

  user.otp = otpCode;
  user.otpExpiresAt = otpExpiresAt;
  await user.save();

  await sendResetPasswordEmail(user, otpCode);
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<void> {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt');
  if (!user) throw new AppError('User not found.', 404);

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('OTP has expired or is invalid. Please request a new one.', 400);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }

  return;
}

export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<IUserDocument> {
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt +passwordHash');
  if (!user) throw new AppError('User not found.', 404);

  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new AppError('OTP has expired or is invalid. Please request a new one.', 400);
  }

  if (user.otp !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }

  user.passwordHash = newPassword as any;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const sanitized: any = user.toObject();
  delete sanitized.passwordHash;
  delete sanitized.otp;
  delete sanitized.otpExpiresAt;
  return sanitized as IUserDocument;
}

export async function getAuthenticatedUser(userId: string): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
}