// frontend/src/services/user.service.ts
import apiFetch from '@/services/api';
import type { UpdateProfilePayload } from '@/types/user';

export async function updateProfile(payload: UpdateProfilePayload) {
  const response = await apiFetch('/users/profile/secure', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response;
}

export async function getPublicProfile(username: string) {
  // Debug: log when frontend attempts to fetch a public profile
  // eslint-disable-next-line no-console
  console.debug('[user.service] getPublicProfile requested for username:', username);
  const response = await apiFetch(`/users/${username}`, {
    method: 'GET',
  });
  return response; // Backend returns { user: {...} }
}

// frontend/src/services/user.service.ts

export async function searchUsers(query: string) {
  const response = await apiFetch(`/users/search/query?q=${encodeURIComponent(query)}`, {
    method: 'GET',
  });
  return response; // Expected { data: User[] }
}

export async function sendFriendRequest(receiverId: string) {
  return await apiFetch('/users/friends/request', {
    method: 'POST',
    body: JSON.stringify({ receiverId }),
  });
}

export async function getRelations(ids: string[]) {
  return await apiFetch('/users/friends/status', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
export async function getFriends() {
  return await apiFetch('/users/friends', {
    method: 'GET',
  });
}
export async function addFriend(friendId: string) {
  return await apiFetch('/users/friends/add', {
    method: 'POST',
    body: JSON.stringify({ friendId }),
  });
}

export async function removeFriend(friendId: string) {
  return await apiFetch('/users/friends/remove', {
    method: 'POST',
    body: JSON.stringify({ friendId }),
  });
}

export async function acceptFriendRequest(requestId: string) {
  return await apiFetch('/users/friends/accept', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
}

export async function getFriendRequests() {
  return await apiFetch('/users/friends/requests', {
    method: 'GET',
  });
}

export async function reportUser(payload: { targetId: string; reason: string; description?: string }) {
  return await apiFetch('/users/report-user', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}