// backend/controllers/user.controller.ts

import { type Response, type NextFunction } from 'express';
import { updateProfileWithPasswordCheck } from '../services/user.service.ts';
import type { UpdateProfileData } from '../types/user.ts';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import UserModel from '../models/User.model.ts';
import AppError from '../utils/appError.ts';
import * as userService from '../services/user.service.ts';
import { UserRole } from '../types/user.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';
import { uploadToImgBB } from '../services/imgbb.service.ts';

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

    // --- ImgBB Upload Logic ---
    if (updateData.profilePicture && updateData.profilePicture.startsWith('data:image')) {
      try {
        // Extract base64 data
        const matches = updateData.profilePicture.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const filename = `avatar-${userId}-${Date.now()}.${mimeType.split('/')[1]}`;

          console.log(`[user.controller] Uploading avatar for user ${userId} to ImgBB...`);
          const publicUrl = await uploadToImgBB(buffer, filename);

          // Replace base64 string with Public URL
          updateData.profilePicture = publicUrl;
        }
      } catch (uploadErr) {
        console.error('[user.controller] Upload failed:', uploadErr);
        throw new AppError('Failed to upload profile picture', 500);
      }
    }
    // ---------------------------------

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
    if (!username) throw new AppError('Username parameter required', 400);
    console.log('[user.controller] getPublicProfile requested username:', username);

    const user = await UserModel.findOne({ username: username as string, isActive: true })
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
        id: user._id.toString(),
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

export async function sendFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const senderId = req.user._id.toString();
    const { receiverId } = req.body as { receiverId: string };
    const created = await userService.sendFriendRequestService(senderId, receiverId);
    return res.status(201).json({ status: 'success', data: created });
  } catch (error) {
    next(error);
  }
}

export async function acceptFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { requestId } = req.body as { requestId: string };
    const currentUserId = req.user._id.toString();
    await userService.acceptFriendRequestService(requestId, currentUserId);
    return res.status(200).json({ status: 'success', message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
}

export async function listFriendRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const requests = await userService.listIncomingFriendRequestsService(userId);
    return res.status(200).json({ status: 'success', data: requests });
  } catch (error) {
    next(error);
  }
}

export async function listFriends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const friends = await userService.listFriendsService(userId);
    return res.status(200).json({ status: 'success', data: friends });
  } catch (error) {
    next(error);
  }
}

export async function friendRelations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const ids = req.body.ids as string[];
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ status: 'fail', message: 'ids required' });
    const map = await userService.getRelationsForTargets(userId, ids);
    return res.status(200).json({ status: 'success', data: map });
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
    const userId = req.params.id as string;
    const { reason, until } = req.body as { reason?: string; until?: string };
    const dateUntil = until ? new Date(until) : undefined;

    await userService.banUserService(userId, reason, dateUntil);

    return res.status(200).json({ status: 'success', message: 'User banned', userId });
  } catch (error) {
    next(error);
  }
}

export async function unbanUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id;
    await userService.unbanUserService(userId);

    return res.status(200).json({ status: 'success', message: 'User unbanned', userId });
  } catch (error) {
    next(error);
  }
}

export async function searchUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { q } = req.query; // query string
    const users = await userService.searchUsersService(q as string);
    return res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    next(error);
  }
}

export async function addFriend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const { friendId } = req.body;
    await userService.addFriendService(userId, friendId);
    return res.status(200).json({ status: 'success', message: 'Friend added' });
  } catch (error) {
    next(error);
  }
}

export async function unfriendUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const { friendId } = req.body as { friendId: string };
    await userService.removeFriendService(userId, friendId);
    return res.status(200).json({ status: 'success', message: 'Friend removed' });
  } catch (error) {
    next(error);
  }
}

import { ReportService } from '../services/report.service.ts';

// ...

export async function reportUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const reporterId = req.user._id.toString();
    const { targetId, reason, description } = req.body;
    await ReportService.reportUser(reporterId, targetId, reason, description);
    return res.status(201).json({ status: 'success', message: 'Report submitted' });
  } catch (error) {
    next(error);
  }
}

export async function adminSearchUsersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;
    if (!q) return res.status(200).json({ status: 'success', data: [] });

    const users = await userService.adminSearchUsers(q as string);
    return res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    next(error);
  }
}

export async function getBannedUsersController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const users = await userService.getBannedUsers();
    return res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    next(error);
  }
}