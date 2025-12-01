import apiFetch, { setAuthToken, clearAuth } from './api';

type LoginPayload = { email?: string; username?: string; password: string };

export async function login(payload: LoginPayload) {
  const data = await apiFetch<{ accessToken: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data?.accessToken) {
    setAuthToken(data.accessToken);
  }

  return data;
}

export function logout() {
  clearAuth();
}

export default { login, logout };
