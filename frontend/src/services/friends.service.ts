import apiFetch, { apiData } from './api';

export interface FriendUser {
  _id: string;
  username: string;
  name?: string;
  profilePicture?: string;
}

export interface FriendSuggestion extends FriendUser {
  mutualFriends: number;
}

export interface IncomingFriendRequest {
  _id: string;
  sender: FriendUser;
  receiver: string;
  createdAt: string;
}

export interface OutgoingFriendRequest {
  _id: string;
  sender: string;
  receiver: FriendUser;
  createdAt: string;
}

export type Relation = 'friends' | 'pending_sent' | 'pending_received' | 'none';

const postOpts = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const post = (path: string, body: unknown) => apiFetch(path, postOpts(body));

export const getFriends = () => apiData<FriendUser[]>('/users/friends');
export const getIncomingRequests = () => apiData<IncomingFriendRequest[]>('/users/friends/requests');
export const getOutgoingRequests = () => apiData<OutgoingFriendRequest[]>('/users/friends/sent');
export const getSuggestions = () => apiData<FriendSuggestion[]>('/users/friends/suggestions');
export const getUserFriends = (username: string) => apiData<FriendUser[]>(`/users/${encodeURIComponent(username)}/friends`);
export const getRelations = (ids: string[]) => apiData<Record<string, Relation>>('/users/friends/status', postOpts({ ids }));

export const sendRequest = async (receiverId: string) => { await post('/users/friends/request', { receiverId }); };
export const acceptRequest = async (requestId: string) => { await post('/users/friends/accept', { requestId }); };
export const rejectRequest = async (requestId: string) => { await post('/users/friends/reject', { requestId }); };
export const cancelRequest = async (requestId: string) => { await post('/users/friends/cancel', { requestId }); };
export const removeFriend = async (friendId: string) => { await post('/users/friends/remove', { friendId }); };
