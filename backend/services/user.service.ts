import type { UpdateProfileData, IUser } from '../types/user.ts';
import UserModel from '../models/User.model.ts';
import AppError from '../utils/appError.ts';
import { ReportModel, ReportTargetType } from '../models/Report.model.ts';
import FriendRequestModel, { FriendRequestStatus } from '../models/FriendRequest.model.ts';
import * as notificationService from './notification.service.ts';

export async function updateProfileWithPasswordCheck(
  userId: string,
  currentPassword: string | undefined,
  updateData: UpdateProfileData
): Promise<IUser> {

  const user = await UserModel.findById(userId).select('+passwordHash');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isChangingPassword = !!updateData.password;

  if (isChangingPassword && user.authProvider === 'local') {
    if (!currentPassword) {
      throw new AppError('Current password is required to change password', 400);
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Incorrect current password', 401);
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No update fields provided', 400); // Bad Request
  }

  if (updateData.username && updateData.username !== user.username) {
    const existingUser = await UserModel.findOne({ username: updateData.username });
    if (existingUser) {
      throw new AppError('Username already taken', 400);
    }
  }

  const validUpdates: any = { ...updateData };

  if (validUpdates.birthdate && typeof validUpdates.birthdate === 'string') {
    const d = new Date(validUpdates.birthdate);
    if (isNaN(d.getTime())) {
      throw new AppError('Invalid birthdate format', 400);
    }
    validUpdates.birthdate = d;
  }

  if (Object.prototype.hasOwnProperty.call(validUpdates, 'profilePicture') && validUpdates.profilePicture === '') {
    validUpdates.profilePicture = undefined;
  }

  if (validUpdates.password) {
    const newPassword = validUpdates.password;
    delete validUpdates.password;

    try {
      if (Object.keys(validUpdates).length > 0) {
        await UserModel.findByIdAndUpdate(
          userId,
          { $set: validUpdates },
          { new: true, runValidators: true }
        );
      }

      const userForPassword = await UserModel.findById(userId).select('+passwordHash');
      if (!userForPassword) {
        throw new AppError('User not found after update', 500);
      }

      userForPassword.passwordHash = newPassword;
      await userForPassword.save();

      const updatedUser = await UserModel.findById(userId)
        .select('-passwordHash -__v -authProvider -refreshToken -otp -otpExpiresAt')
        .exec();

      if (!updatedUser) {
        throw new AppError('User not found after password update', 500);
      }

      return updatedUser as IUser;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Database error during password update:', error);
      throw new AppError('Failed to update password', 500);
    }
  }

  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: validUpdates },
      { new: true, runValidators: true }
    )
      .select('-passwordHash -__v -authProvider -refreshToken -otp -otpExpiresAt')
      .exec();

    if (!updatedUser) {
      throw new AppError('User not found after update', 500);
    }

    return updatedUser as IUser;

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Database error during secure profile update:', error);
    throw new AppError('Failed to update profile due to invalid data or server error', 500);
  }
}

interface GoogleProfileData {
  email: string;
  name: string;
  googleId: string;
}

const DEFAULT_BIRTHDATE = new Date('2000-01-01');

export async function findOrCreateByGoogleId(
  profileData: GoogleProfileData
): Promise<IUser> {
  const { email, name, googleId } = profileData;

  let user = await UserModel.findOne({
    $or: [{ googleId }, { email }],
  })
    .select('-passwordHash -__v -refreshToken -otp -otpExpiresAt')
    .exec();

  if (user) {

    if (user.authProvider === 'local' && !user.googleId) {
    }

    return user as IUser;
  }

  try {
    const baseUsername = email.split('@')[0];

    const uniqueUsername = await generateUniqueUsername(baseUsername);

    const newUser = await UserModel.create({
      email,
      name,
      googleId,
      username: uniqueUsername,
      authProvider: 'google',
      isVerified: true,
      birthdate: DEFAULT_BIRTHDATE,
    });

    const sanitizedUser = await UserModel.findById(newUser._id)
      .select('-passwordHash -__v -refreshToken -otp -otpExpiresAt')
      .exec();

    if (!sanitizedUser) {
      throw new AppError('Failed to create user but database operation reported success', 500);
    }

    return sanitizedUser as IUser;

  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Database error during Google user creation:', error);
    throw new AppError('Failed to create user with Google', 500);
  }
}

async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let isUnique = false;
  let attempts = 0;


  while (!isUnique && attempts < 5) {
    const userExists = await UserModel.exists({ username });

    if (!userExists) {
      isUnique = true;
    } else {
      const randomNumber = Math.floor(100 + Math.random() * 900);
      username = `${baseUsername}${randomNumber}`;
      attempts++;
    }
  }

  if (!isUnique) {
    throw new AppError('Failed to generate a unique username', 500);
  }

  return username;
}

export const searchUsersService = async (query: string, limit: number = 10) => {
  return await UserModel.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } }
    ],
    isActive: true,
    isBanned: false
  })
    .select('username name profilePicture role')
    .limit(limit)
    .lean();
};

export const addFriendService = async (userId: string, friendId: string) => {
  if (userId === friendId) throw new AppError('Cannot add yourself', 400);

  const user = await UserModel.findById(userId);
  if (user?.friends?.includes(friendId as any)) {
    throw new AppError('Already friends', 400);
  }

  await UserModel.findByIdAndUpdate(userId, { $addToSet: { friends: friendId } });
  await UserModel.findByIdAndUpdate(friendId, { $addToSet: { friends: userId } });

  return { success: true };
};

export const removeFriendService = async (userId: string, friendId: string) => {
  if (userId === friendId) throw new AppError('Cannot remove yourself', 400);

  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if (!((user as any).friends || []).map((f: any) => f.toString()).includes(friendId)) {
    throw new AppError('Not friends', 400);
  }

  await UserModel.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
  await UserModel.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

  return { success: true };
};

export const reportUserService = async (reporterId: string, targetId: string, reason: string, description?: string) => {
  return await ReportModel.create({
    reporter: reporterId as any,
    targetId: targetId as any,
    targetType: ReportTargetType.User,
    reason,
    description
  } as any);
};

export const sendFriendRequestService = async (senderId: string, receiverId: string) => {
  if (senderId === receiverId) throw new AppError('Cannot add yourself', 400);

  const sender = await UserModel.findById(senderId);
  if (sender?.friends?.includes(receiverId as any)) {
    throw new AppError('Already friends', 400);
  }

  const existingRequest = await FriendRequestModel.findOne({
    sender: senderId as any,
    receiver: receiverId as any
  });

  if (existingRequest) {
    if (existingRequest.status === FriendRequestStatus.Pending) {
      throw new AppError('Request already sent', 400);
    }
    await FriendRequestModel.deleteOne({ _id: existingRequest._id });
  }

  const created = await FriendRequestModel.create({ sender: senderId as any, receiver: receiverId as any } as any);

  try {
    const receiver = await UserModel.findById(receiverId).select('notificationsEnabled');
    if (receiver && (receiver as any).notificationsEnabled !== false) {
      await notificationService.createNotification({
        userId: receiverId,
        actorId: senderId,
        type: 'friend_request_received',
        title: 'New friend request',
        body: 'You received a friend request',
        data: { senderId }
      });
    }
  } catch (err) {
    console.error('Failed to create friend request notification:', err);
  }

  return created;
};

export const acceptFriendRequestService = async (requestId: string, currentUserId: string) => {
  const request = await FriendRequestModel.findById(requestId);

  if (!request || request.receiver.toString() !== currentUserId) {
    throw new AppError('Request not found or unauthorized', 404);
  }

  if (request.status !== FriendRequestStatus.Pending) {
    throw new AppError('Request is no longer pending', 400);
  }

  request.status = FriendRequestStatus.Accepted;
  await request.save();

  await UserModel.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
  await UserModel.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

  try {
    const sender = request.sender.toString();
    await notificationService.createNotification({
      userId: sender,
      actorId: currentUserId,
      type: 'friend_request_accepted',
      title: 'Friend request accepted',
      body: 'Your friend request was accepted',
      data: { by: currentUserId }
    });
  } catch (err) {
    console.error('Failed to create friend-accepted notification:', err);
  }

  return { success: true };
};

export const listIncomingFriendRequestsService = async (userId: string) => {
  return await FriendRequestModel.find({ receiver: userId, status: FriendRequestStatus.Pending })
    .populate('sender', 'username name profilePicture')
    .lean();
};

export const listFriendsService = async (userId: string) => {
  const doc = await UserModel.findById(userId)
    .select('friends')
    .populate({ path: 'friends', select: 'username name profilePicture' })
    .lean();

  return (doc && (doc as any).friends) || [];
};


export const getRelationsForTargets = async (userId: string, targets: string[]) => {
  const user = await UserModel.findById(userId).select('friends').lean();
  const friendSet = new Set(
    ((user && (user as any).friends) || []).map((id: any) => id.toString())
  );

  const pending = await FriendRequestModel.find({
    $or: [
      { sender: userId as any, receiver: { $in: targets as any }, status: FriendRequestStatus.Pending },
      { receiver: userId as any, sender: { $in: targets as any }, status: FriendRequestStatus.Pending }
    ]
  } as any).lean();

  const map: Record<string, string> = {};
  for (const t of targets) {
    if (friendSet.has(t)) map[t] = 'friends';
    else map[t] = 'none';
  }

  for (const p of pending) {
    const s = p.sender.toString();
    const r = p.receiver.toString();
    if (s === userId) map[r] = 'pending_sent';
    if (r === userId) map[s] = 'pending_received';
  }

  return map;
};

export const banUserService = async (userId: string, reason?: string, until?: Date) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  user.isBanned = true;
  if (reason) (user as any).bannedReason = reason;
  if (until) (user as any).bannedUntil = until;

  await user.save();
  return user;
};

export const adminSearchUsers = async (filters: {
  q?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) => {
  const { q, role, status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = filters;

  const query: any = {};

  if (q) {
    query.$or = [
      { username: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } }
    ];
  }

  if (role && role !== 'all') {
    query.role = role;
  }

  if (status && status !== 'all') {
    if (status === 'banned') query.isBanned = true;
    else if (status === 'active') query.isBanned = false;
  }

  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    UserModel.find(query)
      .select('username name profilePicture role isBanned bannedReason bannedUntil email createdAt isActive')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(query)
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const createUserService = async (data: any) => {
  const exists = await UserModel.findOne({ $or: [{ username: data.username }, { email: data.email }] });
  if (exists) throw new AppError('Username or email already exists', 400);

  if (data.password) {
    data.passwordHash = data.password;
    delete data.password;
  }

  if (!data.birthdate) {
    data.birthdate = new Date('2000-01-01');
  }

  const user = await UserModel.create({
    ...data,
    isActive: true,
    isVerified: true
  });

  return user;
}

export const deleteUserService = async (userId: string) => {
  const user = await UserModel.findByIdAndDelete(userId);
  if (!user) throw new AppError('User not found', 404);
  return { success: true };
}

export const updateUserAdminService = async (userId: string, data: any) => {
  if (data.password === '' || data.password === undefined) {
    delete data.password;
  }

  if (data.username || data.email) {
    const query: any = { _id: { $ne: userId }, $or: [] };
    if (data.username) query.$or.push({ username: data.username });
    if (data.email) query.$or.push({ email: data.email });

    if (query.$or.length > 0) {
      const exists = await UserModel.findOne(query);
      if (exists) throw new AppError('Username or email already in use', 400);
    }
  }

  if (data.password) {
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.passwordHash = data.password;

    const { password, ...otherData } = data;
    Object.assign(user, otherData);

    await user.save();
    return user;
  } else {
    const user = await UserModel.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}

export const getBannedUsers = async () => {
  return await UserModel.find({ isBanned: true })
    .select('username name profilePicture role isBanned bannedReason bannedUntil email')
    .sort({ bannedUntil: 1 }) // Show closest unban date first (or just default sort)
    .lean();
};

export const unbanUserService = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  user.isBanned = false;
  (user as any).bannedReason = undefined;
  (user as any).bannedUntil = undefined;

  await user.save();
  return user;
};

export const getFriendSuggestionsService = async (userId: string, limit: number = 10) => {
  const currentUser = await UserModel.findById(userId).select('friends').lean();
  if (!currentUser) throw new AppError('User not found', 404);

  const myFriends = (currentUser as any).friends || [];

  return await UserModel.aggregate([
    {
      $match: {
        _id: {
          $ne: currentUser._id,
          $nin: myFriends
        },
        role: { $ne: 'admin' },
        isActive: true,
        isBanned: false
      }
    },
    {
      $addFields: {
        mutualFriendsCount: {
          $size: {
            $setIntersection: [
              { $ifNull: ["$friends", []] },
              myFriends
            ]
          }
        }
      }
    },
    {
      $sort: { mutualFriendsCount: -1, createdAt: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: 1,
        username: 1,
        name: 1,
        profilePicture: 1,
        mutualFriends: "$mutualFriendsCount"
      }
    }
  ]);
};

export const listOutgoingFriendRequestsService = async (userId: string) => {
  return await FriendRequestModel.find({ sender: userId, status: FriendRequestStatus.Pending })
    .populate('receiver', 'username name profilePicture')
    .lean();
};

export const cancelFriendRequestService = async (userId: string, requestId: string) => {
  const request = await FriendRequestModel.findById(requestId);

  if (!request) {
    throw new AppError('Friend request not found', 404);
  }

  if (request.sender.toString() !== userId) {
    throw new AppError('Unauthorized to cancel this request', 403);
  }

  if (request.status !== FriendRequestStatus.Pending) {
    throw new AppError('Can only cancel pending requests', 400);
  }

  await FriendRequestModel.findByIdAndDelete(requestId);
  return { message: 'Friend request cancelled successfully' };
};

export const rejectFriendRequestService = async (userId: string, requestId: string) => {
  const request = await FriendRequestModel.findById(requestId);

  if (!request) {
    throw new AppError('Friend request not found', 404);
  }

  if (request.receiver.toString() !== userId) {
    throw new AppError('Unauthorized to reject this request', 403);
  }

  if (request.status !== FriendRequestStatus.Pending) {
    throw new AppError('Can only reject pending requests', 400);
  }

  await FriendRequestModel.findByIdAndDelete(requestId);
  return { message: 'Friend request rejected successfully' };
};