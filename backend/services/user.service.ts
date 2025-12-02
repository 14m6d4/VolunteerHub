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
  currentPassword: string, 
  updateData: UpdateProfileData
): Promise<IUser> {
  
  // 1. Get the user object, specifically requesting the hidden passwordHash field
  const user = await UserModel.findById(userId).select('+passwordHash');
  
  if (!user) {
    // Should theoretically not happen if auth middleware is correct
    throw new AppError('User not found', 404);
  }
  
  // 2. Password Verification
  const isMatch = await user.comparePassword(currentPassword);
  
  if (!isMatch) {
    throw new AppError('Incorrect current password', 401); // Unauthorized
  }

  // 3. Check if any fields were actually provided for update
  if (Object.keys(updateData).length === 0) {
    throw new AppError('No update fields provided', 400); // Bad Request
  }

  // Sanitize updateData (Mongoose model might have 'username' instead of 'firstName/lastName')
  // We assume UpdateProfileData matches the updatable fields in the Mongoose model schema (e.g., username, profilePicture, notificationsEnabled, etc.)
  const validUpdates = { ...updateData };
  
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