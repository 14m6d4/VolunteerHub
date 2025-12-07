import { useState, useEffect, useCallback } from 'react';
import * as authService from '@/services/auth.service';

type User = any;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  // On mount: if an access token exists, fetch profile
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const res = await authService.getProfile();
        if (mounted) setUser(res.user || null);
      } catch (err) {
        // failed to fetch profile, clear auth
        authService.logout();
        setUser(null);
      }
    };
    init();
    return () => { mounted = false };
  }, []);

  const login = useCallback(async (payload: { email?: string; username?: string; password: string }) => {
    const data = await authService.login(payload);
    try {
      // eslint-disable-next-line no-console
      console.debug('[useAuth] login result:', data);
    } catch {}

    // After login (token set), fetch profile from backend
    try {
      const profile = await authService.getProfile();
      setUser(profile.user || null);
    } catch (err) {
      setUser(null);
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return { user, setUser, login, logout } as const;
}

export default useAuth;
