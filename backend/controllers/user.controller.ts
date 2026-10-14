import { type Response, type NextFunction } from 'express';
import { updateProfileWithPasswordCheck } from '../services/user.service.ts';
import type { UpdateProfileData } from '../types/user.ts';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import AppError from '../utils/appError.ts';
import * as userService from '../services/user.service.ts';
import { UserRole } from '../types/user.ts';
import { roleMiddleware } from '../middlewares/role.middleware.ts';
import { deleteImages, MAX_IMAGE_BYTES, saveImage } from '../services/image.service.ts';

export type SecureUpdateProfilePayload = UpdateProfileData & {
  currentPassword?: string;
};

export async function updateProfileSecure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // An avatar saved for a request that then fails is deleted again.
  let avatar: string | undefined;
  try {
    const userId = req.user._id.toString();

    const { currentPassword, ...updateData }: SecureUpdateProfilePayload = req.body;

    // Any data URL the validator let through is re-encoded, even an empty or
    // line-wrapped one, so no raw upload ever lands in the column.
    const base64 = updateData.profilePicture?.match(/^data:image\/[a-zA-Z]+;base64,(.*)$/s)?.[1];
    if (base64 !== undefined) {
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > MAX_IMAGE_BYTES) throw new AppError('Image must be 2 MB or smaller', 413);
      updateData.profilePicture = avatar = await saveImage(buffer);
    }

    const updatedUser = await updateProfileWithPasswordCheck(userId, currentPassword, updateData);

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    await deleteImages(avatar);
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

    const user = await userService.getPublicProfileByUsername(username as string);

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

export async function listSentFriendRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const requests = await userService.listOutgoingFriendRequestsService(userId);
    return res.status(200).json({ status: 'success', data: requests });
  } catch (error) {
    next(error);
  }
}

export async function cancelFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const { requestId } = req.body as { requestId: string };
    const result = await userService.cancelFriendRequestService(userId, requestId);
    return res.status(200).json({ status: 'success', message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function rejectFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const { requestId } = req.body as { requestId: string };
    const result = await userService.rejectFriendRequestService(userId, requestId);
    return res.status(200).json({ status: 'success', message: result.message });
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
    const userId = req.params.id as string;
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
    const { q, role, status, sortBy, sortOrder, page, limit } = req.query as any;

    const result = await userService.adminSearchUsers({
      q: q as string,
      role: role as string,
      status: status as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10
    });
    return res.status(200).json({ status: 'success', data: result.users, meta: { total: result.total, page: result.page, totalPages: result.totalPages } });
  } catch (error) {
    next(error);
  }
}

export async function createUserController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.createUserService(req.body);
    return res.status(201).json({ status: 'success', data: user });
  } catch (error) {
    next(error);
  }
}

export async function deleteUserController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id as string;
    await userService.deleteUserService(userId);
    return res.status(200).json({ status: 'success', message: 'User deleted' });
  } catch (error) {
    next(error);
  }
}

export async function updateUserController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id as string;
    const user = await userService.updateUserAdminService(userId, req.body);
    return res.status(200).json({ status: 'success', data: user });
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

export async function getFriendSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();
    const suggestions = await userService.getFriendSuggestionsService(userId);
    return res.status(200).json({ status: 'success', data: suggestions });
  } catch (error) {
    next(error);
  }
}

export async function getUserStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { username } = req.params;
    if (!username) throw new AppError('Username parameter required', 400);

    const data = await userService.getUserStatsService(username as string);

    return res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { username } = req.params;
    if (!username) throw new AppError('Username parameter required', 400);

    const events = await userService.getUserEventsService(username as string);

    return res.status(200).json({
      status: 'success',
      data: events
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserFriendsList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { username } = req.params;
    if (!username) throw new AppError('Username parameter required', 400);

    const friends = await userService.getUserFriendsListService(username as string);

    return res.status(200).json({
      status: 'success',
      data: friends
    });
  } catch (error) {
    next(error);
  }
}
