import { useState, useEffect, useCallback } from 'react';
import * as authService from '@/services/auth.service';

type User = any;

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const login = useCallback(async (payload: { email?: string; username?: string; password: string }) => {
    const data = await authService.login(payload);
    setUser(data.user || null);
    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return { user, setUser, login, logout } as const;
}

export default useAuth;
