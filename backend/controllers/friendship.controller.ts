import { type Response, type NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import * as friendship from '../services/friendship.service.ts';

const me = (req: AuthenticatedRequest) => req.user._id.toString();

export async function listFriends(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ success: true, data: await friendship.listFriends(me(req)) });
  } catch (error) {
    next(error);
  }
}

export async function getFriendSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ success: true, data: await friendship.friendSuggestions(me(req)) });
  } catch (error) {
    next(error);
  }
}

export async function listFriendRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ success: true, data: await friendship.listIncomingFriendRequests(me(req)) });
  } catch (error) {
    next(error);
  }
}

export async function listSentFriendRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    return res.status(200).json({ success: true, data: await friendship.listOutgoingFriendRequests(me(req)) });
  } catch (error) {
    next(error);
  }
}

export async function sendFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { receiverId } = req.body as { receiverId: string };
    const created = await friendship.sendFriendRequest(me(req), receiverId);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

export async function acceptFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { requestId } = req.body as { requestId: string };
    await friendship.acceptFriendRequest(requestId, me(req));
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function rejectFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { requestId } = req.body as { requestId: string };
    await friendship.rejectFriendRequest(me(req), requestId);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function cancelFriendRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { requestId } = req.body as { requestId: string };
    await friendship.cancelFriendRequest(me(req), requestId);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function friendRelations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { ids } = req.body as { ids: string[] };
    return res.status(200).json({ success: true, data: await friendship.relationsTo(me(req), ids) });
  } catch (error) {
    next(error);
  }
}

export async function addFriend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await friendship.addFriend(me(req), req.body.friendId);
    return res.status(200).json({ status: 'success', message: 'Friend added' });
  } catch (error) {
    next(error);
  }
}

export async function unfriendUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { friendId } = req.body as { friendId: string };
    await friendship.removeFriend(me(req), friendId);
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}
