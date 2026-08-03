import { useState, useEffect, useCallback } from 'react';
import type { PropsWithChildren } from 'react';
import * as authService from '@/services/auth.service';
import { AuthContext, type User } from '@/hooks/useAuth';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setLoading(false);
          return;
        }
        console.log('[AuthProvider] Found accessToken on mount, fetching profile...');
        const res = await authService.getProfile();
        if (mounted) {
          if (res?.user?.isBanned) {
            const params = new URLSearchParams();
            if (res.user.bannedReason) params.set('reason', res.user.bannedReason);
            if (res.user.bannedUntil) params.set('until', res.user.bannedUntil);
            window.location.href = `/banned?${params.toString()}`;
            return;
          }
          setUser(res.user || null);
        }
      } catch (err) {
        console.error('[AuthProvider] Failed to fetch profile on mount:', err);
        if (!(err as { isNetworkError?: boolean })?.isNetworkError && mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    const handleTokenChange = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }
        const res = await authService.getProfile();
        if (res?.user?.isBanned) {
          const params = new URLSearchParams();
          if (res.user.bannedReason) params.set('reason', res.user.bannedReason);
          if (res.user.bannedUntil) params.set('until', res.user.bannedUntil);
          window.location.href = `/banned?${params.toString()}`;
          return;
        }
        setUser(res.user || null);
      } catch (err) {
        console.error('[AuthProvider] Failed to fetch profile after token change:', err);
        if (!(err as { isNetworkError?: boolean })?.isNetworkError) setUser(null);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('storage', handleTokenChange);
    window.addEventListener('authTokenChanged', handleTokenChange);

    return () => {
      window.removeEventListener('storage', handleTokenChange);
      window.removeEventListener('authTokenChanged', handleTokenChange);
    };
  }, []);

  const login = useCallback(async (payload: { email?: string; username?: string; password: string }) => {
    const data = await authService.login(payload);

    try {
      const profile = await authService.getProfile();
      if (profile?.user?.isBanned) {
        const params = new URLSearchParams();
        if (profile.user.bannedReason) params.set('reason', profile.user.bannedReason);
        if (profile.user.bannedUntil) params.set('until', profile.user.bannedUntil);
        window.location.href = `/banned?${params.toString()}`;
        return data;
      }
      setUser(profile.user || null);
    } catch (err) {
      if (!(err as { isNetworkError?: boolean })?.isNetworkError) setUser(null);
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}