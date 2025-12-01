// backend/controllers/user.controller.ts

import { type Response, type NextFunction } from 'express';
import { updateProfileWithPasswordCheck } from '../services/user.service.ts';
import type { UpdateProfileData } from '../types/user.ts';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';

// Combine the password field with the profile data payload for the API request
export type SecureUpdateProfilePayload = UpdateProfileData & {
  currentPassword: string;
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