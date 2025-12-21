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
    body: data
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
    body: { receiverId }
  });
}

export async function acceptFriendRequest(requestId: string) {
  return apiFetch("/users/friends/accept", {
    method: "POST",
    body: { requestId }
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
    body: { ids }
  });
}

export async function removeFriend(friendId: string) {
  return apiFetch("/users/friends/remove", {
    method: "POST",
    body: { friendId }
  });
}

export async function getUserEventsList(username: string) {
  return apiFetch(`/users/${username}/events`);
}

export async function getUserFriendsList(username: string) {
  return apiFetch(`/users/${username}/friends`);
}