import apiFetch, { setAuthToken, clearAuth } from './api';

type LoginPayload = { email?: string; username?: string; password: string };

export async function login(payload: LoginPayload) {
  const data = await apiFetch<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Debug log: show raw response
  try {
    // eslint-disable-next-line no-console
    console.debug('[auth.service] login response:', data);
  } catch {}

  // Support common token field names (accessToken, access_token, token)
  const token = data?.accessToken || data?.access_token || data?.token;
  if (token) {
    setAuthToken(token);
  } else {
    // eslint-disable-next-line no-console
    console.warn('[auth.service] no access token found in login response');
  }

  return data;
}

export function logout() {
  clearAuth();
}

export default { login, logout };
