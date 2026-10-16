import apiFetch from "./api";
import type { UpdateProfilePayload } from "@/types/user";

// Helper to keep Feed.tsx working (and used in SearchUsers/Friends)
export async function searchUsers(query: string) {
  return apiFetch("/users/search/query", {
    query: { q: query }
  });
}

export async function updateProfile(data: UpdateProfilePayload) {
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

export async function getUserEventsList(username: string) {
  return apiFetch(`/users/${username}/events`);
}

