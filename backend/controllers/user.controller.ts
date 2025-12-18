// backend/controllers/user.controller.ts

import { type Response, type NextFunction } from 'express';
import { updateProfileWithPasswordCheck } from '../services/user.service.ts';
import type { UpdateProfileData } from '../types/user.ts';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import UserModel from '../models/User.model.ts';
import AppError from '../utils/appError.ts';
import { UserRole } from '../types/user.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';

// Combine the password field with the profile data payload for the API request
export type SecureUpdateProfilePayload = UpdateProfileData & {
  currentPassword?: string;
};

/**
 * Controller to handle the secure update of the user's profile.
 * Requires current password verification before proceeding.
 *
 * @param req The Express request object (casted to include user data and body payload).
 * @param res The Express response object.
 * @param next The Express next function for error handling.
 */
export async function updateProfileSecure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // 1. Get the authenticated user ID
    const userId = req.user._id.toString(); 

    // 2. Extract payload including the current password
    const { currentPassword, ...updateData }: SecureUpdateProfilePayload = req.body;

    // 3. Delegate the logic to the service layer
    const updatedUser = await updateProfileWithPasswordCheck(userId, currentPassword, updateData);

    // 4. Send success response (200 OK)
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser 
    });

  } catch (error) {
    // 5. Forward the error (e.g., AppError with status 401 for wrong password)
    next(error);
  }
}

export async function getPublicProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { username } = req.params;
    console.log('[user.controller] getPublicProfile requested username:', username);

    const user = await UserModel.findOne({ username, isActive: true })
      .select('username name birthdate profilePicture role createdAt')
      .lean();

    console.log('[user.controller] db lookup result for', username, ':', !!user);

    if (!user) {
      console.warn(`[user.controller] User not found or deactivated: ${username}`);
      throw new AppError('User not found or deactivated', 404);
    }

    // Nếu là chính mình → vẫn chỉ trả về public fields (frontend sẽ tự check để hiện form)
    // Safely format optional date fields
    const birthdateIso = user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : null;
    const createdAtIso = user.createdAt ? new Date(user.createdAt).toISOString() : null;

    return res.status(200).json({
      user: {
        username: user.username,
        name: user.name || null,
        birthdate: birthdateIso,
        profilePicture: user.profilePicture || null,
        role: user.role,
        createdAt: createdAtIso,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin action: Ban a user by id
 * Expects optional body: { reason?: string, until?: string }
 */
export async function banUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id;
    const { reason, until } = req.body as { reason?: string; until?: string };

    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.isBanned = true;
    user.bannedReason = reason || undefined;
    user.bannedUntil = until ? new Date(until) : undefined;
    await user.save();

    return res.status(200).json({ status: 'success', message: 'User banned', userId: user._id.toString() });
  } catch (error) {
    next(error);
  }
}

export async function unbanUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id;
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.isBanned = false;
    user.bannedReason = undefined;
    user.bannedUntil = undefined;
    await user.save();

    return res.status(200).json({ status: 'success', message: 'User unbanned', userId: user._id.toString() });
  } catch (error) {
    next(error);
  }
}