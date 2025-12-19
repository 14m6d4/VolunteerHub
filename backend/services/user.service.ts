// backend/services/user.service.ts

// Import necessary types and models
import type { UpdateProfileData, IUser } from '../types/user.ts';
import UserModel from '../models/User.model.ts'; // Mongoose User Model
import AppError from '../utils/appError.ts';
import { ReportModel, ReportTargetType } from '../models/Report.model.ts';
import FriendRequestModel, { FriendRequestStatus } from '../models/FriendRequest.model.ts';
import * as notificationService from './notification.service.ts';

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

// Add friend (Simple logic: push to friends array)
export const addFriendService = async (userId: string, friendId: string) => {
  if (userId === friendId) throw new AppError('Cannot add yourself', 400);

  const user = await UserModel.findById(userId);
  if (user?.friends?.includes(friendId as any)) {
    throw new AppError('Already friends', 400);
  }

  // Update both sides
  await UserModel.findByIdAndUpdate(userId, { $addToSet: { friends: friendId } });
  await UserModel.findByIdAndUpdate(friendId, { $addToSet: { friends: userId } });

  return { success: true };
};

// Remove friend from both users' friends arrays
export const removeFriendService = async (userId: string, friendId: string) => {
  if (userId === friendId) throw new AppError('Cannot remove yourself', 400);

  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  // If not friends, return an error
  if (!((user as any).friends || []).map((f: any) => f.toString()).includes(friendId)) {
    throw new AppError('Not friends', 400);
  }

  await UserModel.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
  await UserModel.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

  return { success: true };
};

// Report user service
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

  // Check if already friends
  const sender = await UserModel.findById(senderId);
  if (sender?.friends?.includes(receiverId as any)) {
    throw new AppError('Already friends', 400);
  }

  // Check if a request already exists
  const existingRequest = await FriendRequestModel.findOne({
    sender: senderId as any,
    receiver: receiverId as any,
    status: FriendRequestStatus.Pending
  } as any);
  if (existingRequest) throw new AppError('Request already sent', 400);

  const created = await FriendRequestModel.create({ sender: senderId as any, receiver: receiverId as any } as any);

  // Create a notification for the receiver (if they allow notifications)
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

// Accept friend request
export const acceptFriendRequestService = async (requestId: string, currentUserId: string) => {
  const request = await FriendRequestModel.findById(requestId);

  if (!request || request.receiver.toString() !== currentUserId) {
    throw new AppError('Request not found or unauthorized', 404);
  }

  if (request.status !== FriendRequestStatus.Pending) {
    throw new AppError('Request is no longer pending', 400);
  }

  // Update status
  request.status = FriendRequestStatus.Accepted;
  await request.save();

  // Add to friends array for both users
  await UserModel.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
  await UserModel.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

  // Notify the sender that their request was accepted
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

// List friends for a user (populate basic public fields)
export const listFriendsService = async (userId: string) => {
  const doc = await UserModel.findById(userId)
    .select('friends')
    .populate({ path: 'friends', select: 'username name profilePicture' })
    .lean();

  return (doc && (doc as any).friends) || [];
};

// Return relations for multiple target ids: 'friends' | 'pending_sent' | 'pending_received' | 'none'
export const getRelationsForTargets = async (userId: string, targets: string[]) => {
  // fetch user's friends
  const user = await UserModel.findById(userId).select('friends').lean();
  const friendSet = new Set((user && (user as any).friends) || []);

  // fetch pending requests where user is sender or receiver
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