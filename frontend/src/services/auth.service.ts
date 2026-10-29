import apiFetch, { apiData, setAuthToken, clearAuth } from './api';

export { setAuthToken, clearAuth };

type LoginPayload = { email?: string; username?: string; password: string };

interface AuthResponse {
  user?: {
    isBanned?: boolean;
    bannedReason?: string;
    bannedUntil?: string;
    [key: string]: unknown;
  };
  accessToken?: string;
  access_token?: string;
  token?: string;
  [key: string]: unknown;
}

export type DemoRole = 'volunteer' | 'manager';

async function signIn(path: string, body: unknown) {
  const data = await apiFetch<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  try {
    console.debug('[auth.service] login response:', data);
  } catch { /* logging only */ }

  const token = data?.accessToken || data?.access_token || data?.token;
  if (token) {
    setAuthToken(token);
  } else {
    console.warn('[auth.service] no access token found in login response');
  }

  return data;
}

export const login = (payload: LoginPayload) => signIn('/auth/login', payload);

/** One-click sign-in as the shared demo volunteer or manager. */
export const demoLogin = (role: DemoRole) => signIn('/auth/demo-login', { role });

/** Public auth settings: whether sign-up is open. */
export const getAuthConfig = () => apiData<{ signupEnabled: boolean }>('/auth/config');

export async function getProfile() {
  const data = await apiFetch<AuthResponse>('/auth/me');
  return data;
}

export function logout() {
  clearAuth();
}

export async function register(payload: { username: string; email: string; password: string; name?: string }) {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  try {
    console.debug('[auth.service] register response:', data);
  } catch { /* logging only */ }

  return data;
}

export async function verifyOTP(payload: { email: string; otp: string }) {
  const data = await apiFetch<AuthResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  try {
    console.debug('[auth.service] verifyOTP response:', data);
  } catch { /* logging only */ }

  return data;
}

export default { login, logout, register, verifyOTP };
