// backend/services/user.service.ts

// Import necessary types and models
import type { UpdateProfileData, IUser } from '../types/user.ts';
import UserModel from '../models/User.model.ts'; // Mongoose User Model
import AppError from '../utils/appError.ts';

/**
 * Updates the user's profile after verifying the current password.
 * * @param userId The ID of the authenticated user.
 * @param currentPassword The password provided by the user for verification.
 * @param updateData The fields to update (e.g., firstName, lastName, bio, phone).
 * @returns The updated user object, excluding sensitive fields.
 * @throws AppError if password is wrong, user not found, or update fails.
 */
export async function updateProfileWithPasswordCheck(
  userId: string,
  currentPassword: string | undefined,
  updateData: UpdateProfileData
): Promise<IUser> {

  // 1. Get the user object, specifically requesting the hidden passwordHash field
  const user = await UserModel.findById(userId).select('+passwordHash');

  if (!user) {
    // Should theoretically not happen if auth middleware is correct
    throw new AppError('User not found', 404);
  }

  // 2. Password Verification
  // If the user signed up via Google, allow changing profile without password
  if (user.authProvider === 'local') {
    if (!currentPassword) {
      throw new AppError('Current password is required for local accounts', 400);
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Incorrect current password', 401); // Unauthorized
    }
  }

  // 3. Check if any fields were actually provided for update
  if (Object.keys(updateData).length === 0) {
    throw new AppError('No update fields provided', 400); // Bad Request
  }

  // Sanitize updateData and coerce types where necessary
  const validUpdates: any = { ...updateData };

  // Convert birthdate string (YYYY-MM-DD) into a Date object to satisfy Mongoose Date schema
  if (validUpdates.birthdate && typeof validUpdates.birthdate === 'string') {
    const d = new Date(validUpdates.birthdate);
    if (isNaN(d.getTime())) {
      throw new AppError('Invalid birthdate format', 400);
    }
    validUpdates.birthdate = d;
  }

  // Treat empty profilePicture string as removing the picture
  if (Object.prototype.hasOwnProperty.call(validUpdates, 'profilePicture') && validUpdates.profilePicture === '') {
    validUpdates.profilePicture = undefined;
  }

  try {
    // 4. Perform the update operation
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: validUpdates },
      { new: true, runValidators: true }
    )
      .select('-passwordHash -__v -authProvider -refreshToken -otp -otpExpiresAt') // Exclude sensitive/unnecessary fields
      .exec();

    if (!updatedUser) {
      throw new AppError('User not found after update', 500); // Unexpected error
    }

    // Return the updated and sanitized user object
    return updatedUser as IUser;

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    // Handle specific database errors (e.g., duplicate unique field like email)
    console.error('Database error during secure profile update:', error);
    throw new AppError('Failed to update profile due to invalid data or server error', 500);
  }
}

interface GoogleProfileData {
  email: string;
  name: string; // Tên hiển thị đầy đủ
  googleId: string;
}

const DEFAULT_BIRTHDATE = new Date('2000-01-01');

export async function findOrCreateByGoogleId(
  profileData: GoogleProfileData
): Promise<IUser> {
  const { email, name, googleId } = profileData;

  // 1. Tìm kiếm người dùng bằng googleId hoặc email
  let user = await UserModel.findOne({
    $or: [{ googleId }, { email }],
  })
    .select('-passwordHash -__v -refreshToken -otp -otpExpiresAt')
    .exec();

  if (user) {
    // ... (Logic liên kết tài khoản local đã tồn tại)

    if (user.authProvider === 'local' && !user.googleId) {
      // ... (Logic cập nhật và lưu user)
    }

    return user as IUser;
  }

  // 2. Người dùng chưa tồn tại, chuẩn bị tạo tài khoản mới.
  try {
    // Lọc phần username từ email (ví dụ: 'john.doe@example.com' -> 'john.doe')
    const baseUsername = email.split('@')[0];

    // Tự động tạo username duy nhất
    const uniqueUsername = await generateUniqueUsername(baseUsername);

    const newUser = await UserModel.create({
      email,
      name,
      googleId,
      username: uniqueUsername, // SỬ DỤNG USERNAME ĐÃ ĐƯỢC LỌC VÀ KIỂM TRA
      authProvider: 'google',
      isVerified: true,
      birthdate: DEFAULT_BIRTHDATE, // SỬ DỤNG GIÁ TRỊ MẶC ĐỊNH
    });

    // ... (Logic trả về sanitizedUser)
    const sanitizedUser = await UserModel.findById(newUser._id)
      .select('-passwordHash -__v -refreshToken -otp -otpExpiresAt')
      .exec();

    if (!sanitizedUser) {
      throw new AppError('Failed to create user but database operation reported success', 500);
    }

    return sanitizedUser as IUser;

  } catch (error) {
    // ... (Xử lý lỗi)
    if (error instanceof AppError) throw error;
    console.error('Database error during Google user creation:', error);
    throw new AppError('Failed to create user with Google', 500);
  }
}

async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let isUnique = false;
  let attempts = 0;

  // Vòng lặp tối đa 5 lần để tránh lặp vô hạn
  while (!isUnique && attempts < 5) {
    // 1. Kiểm tra xem username có tồn tại không
    const userExists = await UserModel.exists({ username });

    if (!userExists) {
      isUnique = true;
    } else {
      // 2. Nếu đã tồn tại, thêm 3 ký tự số ngẫu nhiên
      const randomNumber = Math.floor(100 + Math.random() * 900); // Số từ 100 đến 999
      username = `${baseUsername}${randomNumber}`;
      attempts++;
    }
  }

  // Nếu sau nhiều lần thử vẫn trùng, hãy ném lỗi (rất hiếm)
  if (!isUnique) {
    throw new AppError('Failed to generate a unique username', 500);
  }

  return username;
}