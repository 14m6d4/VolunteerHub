import apiFetch from "./api";

// Helper to keep Feed.tsx working (and used in SearchUsers/Friends)
export async function searchUsers(query: string) {
  return apiFetch("/users/search/query", {
    query: { q: query }
  });
}

export async function getFriendSuggestions() {
  return apiFetch("/users/friends/suggestions");
}

export async function updateProfile(data: any) {
  return apiFetch("/users/profile/secure", {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  });
}

export async function getPublicProfile(username: string) {
  return apiFetch(`/users/${username}`);
}

export async function getUserStats(username: string) {
  return apiFetch(`/users/${username}/stats`);
}

export async function sendFriendRequest(receiverId: string) {
  return apiFetch("/users/friends/request", {
    method: "POST",
    body: JSON.stringify({ receiverId }),
    headers: { "Content-Type": "application/json" }
  });
}

export async function acceptFriendRequest(requestId: string) {
  return apiFetch("/users/friends/accept", {
    method: "POST",
    body: JSON.stringify({ requestId }),
    headers: { "Content-Type": "application/json" }
  });
}

export async function getFriendRequests() {
  return apiFetch("/users/friends/requests");
}

export async function getFriends() {
  return apiFetch("/users/friends");
}

export async function getRelations(ids: string[]) {
  return apiFetch("/users/friends/status", {
    method: "POST",
    body: JSON.stringify({ ids }),
    headers: { "Content-Type": "application/json" }
  });
}

export async function removeFriend(friendId: string) {
  return apiFetch("/users/friends/remove", {
    method: "POST",
    body: JSON.stringify({ friendId }),
    headers: { "Content-Type": "application/json" }
  });
}

export async function getUserEventsList(username: string) {
  return apiFetch(`/users/${username}/events`);
}

export async function getUserFriendsList(username: string) {
  return apiFetch(`/users/${username}/friends`);
}

// Get sent friend requests
export async function getSentFriendRequests() {
  return apiFetch('/users/friends/sent');
}

// Cancel a friend request
export async function cancelFriendRequest(requestId: string) {
  return apiFetch(`/users/friends/cancel`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
    headers: { 'Content-Type': 'application/json' }
  });
}

// Reject a friend request
export async function rejectFriendRequest(requestId: string) {
  return apiFetch(`/users/friends/reject`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
    headers: { 'Content-Type': 'application/json' }
  });
}