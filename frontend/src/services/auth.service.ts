import apiFetch, { setAuthToken, clearAuth } from './api';

export { setAuthToken, clearAuth };

type LoginPayload = { email?: string; username?: string; password: string };

export async function login(payload: LoginPayload) {
  const data = await apiFetch<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  try {
    console.debug('[auth.service] login response:', data);
  } catch { }

  const token = data?.accessToken || data?.access_token || data?.token;
  if (token) {
    setAuthToken(token);
  } else {
    console.warn('[auth.service] no access token found in login response');
  }

  return data;
}

export async function getProfile() {
  const data = await apiFetch<any>('/auth/me');
  return data;
}

export function logout() {
  clearAuth();
}

export async function register(payload: { username: string; email: string; password: string; name?: string }) {
  const data = await apiFetch<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  try {
    console.debug('[auth.service] register response:', data);
  } catch { }

  return data;
}

export async function verifyOTP(payload: { email: string; otp: string }) {
  const data = await apiFetch<any>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  try {
    console.debug('[auth.service] verifyOTP response:', data);
  } catch { }

  return data;
}

export default { login, logout, register, verifyOTP };
