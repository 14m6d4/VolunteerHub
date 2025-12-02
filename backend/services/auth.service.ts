// backend/services/auth.service.ts

import { type ITokenPayload, type IUserDocument, UserRole, type ILoginDTO, type IRegisterDTO } from '../types/user.ts'; 
import { createAccessToken, createRefreshToken } from '../utils/jwt.util.ts';
import AppError from '../utils/appError.ts'; 
import User from '../models/User.model.ts'; 
import { generateOTP, getOTPExpiration } from '../utils/otp.util.ts';
import { sendVerificationEmail } from './email.service.ts';

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
  
  // Check if user is active
  if (!user.isActive) {
      throw new AppError('Account is inactive. Please contact support.', 403);
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