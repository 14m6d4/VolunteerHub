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

export type SecureUpdateProfilePayload = UpdateProfileData & {
  currentPassword?: string;
};

export async function updateProfileSecure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user._id.toString();

    const { currentPassword, ...updateData }: SecureUpdateProfilePayload = req.body;

    if (updateData.profilePicture && updateData.profilePicture.startsWith('data:image')) {
      try {
        const matches = updateData.profilePicture.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const filename = `avatar-${userId}-${Date.now()}.${mimeType.split('/')[1]}`;

          console.log(`[user.controller] Uploading avatar for user ${userId} to ImgBB...`);
          const publicUrl = await uploadToImgBB(buffer, filename);

          updateData.profilePicture = publicUrl;
        }
      } catch (uploadErr) {
        console.error('[user.controller] Upload failed:', uploadErr);
        throw new AppError('Failed to upload profile picture', 500);
      }
    }

    const updatedUser = await updateProfileWithPasswordCheck(userId, currentPassword, updateData);

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
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
    const userId = req.params.id;
    await userService.deleteUserService(userId);
    return res.status(200).json({ status: 'success', message: 'User deleted' });
  } catch (error) {
    next(error);
  }
}

export async function updateUserController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.params.id;
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

    const user = await UserModel.findOne({ username: username as string, isActive: true })
      .select('_id role')
      .lean();

    if (!user) {
      throw new AppError('User not found or deactivated', 404);
    }

    if (user.role === UserRole.Admin) {
      throw new AppError('Access to admin profiles is forbidden', 403);
    }

    const userId = user._id.toString();
    const now = new Date();

    let stats: any = {};

    if (user.role === UserRole.Volunteer) {
      const { EventModel } = await import('../models/Event.model.ts');
      const { RegistrationModel, RegistrationStatus } = await import('../models/Registration.model.ts');
      const { EventStatus } = await import('../models/Event.model.ts');

      const registrations = await RegistrationModel.find({
        volunteerId: userId,
        status: RegistrationStatus.APPROVED
      }).select('eventId').lean();

      const eventIds = registrations.map(r => r.eventId);

      if (eventIds.length > 0) {
        const activeEvents = await EventModel.countDocuments({
          _id: { $in: eventIds },
          status: EventStatus.APPROVED
        });

        const completedEvents = await EventModel.countDocuments({
          _id: { $in: eventIds },
          status: EventStatus.FINISHED
        });

        stats = {
          activeEvents,
          completedEvents
        };
      } else {
        stats = {
          activeEvents: 0,
          completedEvents: 0
        };
      }
    } else if (user.role === UserRole.Manager) {
      const { EventModel, EventStatus } = await import('../models/Event.model.ts');

      const activeEvents = await EventModel.countDocuments({
        managerId: userId,
        status: EventStatus.APPROVED
      });

      const eventsOrganized = await EventModel.countDocuments({
        managerId: userId,
        status: EventStatus.FINISHED
      });

      stats = {
        activeEvents,
        eventsOrganized
      };
    }

    const userWithFriends = await UserModel.findById(userId).select('friends').lean();
    const friendsCount = (userWithFriends && (userWithFriends as any).friends) ? (userWithFriends as any).friends.length : 0;

    stats.friends = friendsCount;

    return res.status(200).json({
      status: 'success',
      data: {
        role: user.role,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { username } = req.params;
    if (!username) throw new AppError('Username parameter required', 400);

    const user = await UserModel.findOne({ username: username as string, isActive: true })
      .select('_id role')
      .lean();

    if (!user) {
      throw new AppError('User not found or deactivated', 404);
    }

    if (user.role === UserRole.Admin) {
      throw new AppError('Access to admin profiles is forbidden', 403);
    }

    const userId = user._id.toString();
    const { EventModel } = await import('../models/Event.model.ts');
    const { RegistrationModel, RegistrationStatus } = await import('../models/Registration.model.ts');

    let events: any[] = [];

    if (user.role === UserRole.Volunteer) {
      const registrations = await RegistrationModel.find({
        volunteerId: userId,
        status: RegistrationStatus.APPROVED
      }).select('eventId').lean();

      const eventIds = registrations.map(r => r.eventId);

      if (eventIds.length > 0) {
        events = await EventModel.find({
          _id: { $in: eventIds }
        })
          .select('_id title image startAt endAt location currentMembers tags description status')
          .lean();
      }
    } else if (user.role === UserRole.Manager) {
      events = await EventModel.find({
        managerId: userId
      })
        .select('_id title image startAt endAt location currentMembers tags description status')
        .lean();
    }

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

    const user = await UserModel.findOne({ username: username as string, isActive: true })
      .select('_id role friends')
      .populate({
        path: 'friends',
        select: 'username name profilePicture role'
      })
      .lean();

    if (!user) {
      throw new AppError('User not found or deactivated', 404);
    }

    if (user.role === UserRole.Admin) {
      throw new AppError('Access to admin profiles is forbidden', 403);
    }

    const friends = (user as any).friends || [];

    return res.status(200).json({
      status: 'success',
      data: friends
    });
  } catch (error) {
    next(error);
  }
}
