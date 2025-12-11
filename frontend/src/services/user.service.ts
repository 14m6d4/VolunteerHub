// frontend/src/services/user.service.ts
import apiFetch from '@/services/api';
import type { User, UpdateProfilePayload } from '@/types/user';

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