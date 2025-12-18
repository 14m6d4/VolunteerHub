import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import * as authService from '@/services/auth.service';

type User = any; // Có thể thay bằng interface IUser nếu bạn có trong types

interface AuthContextType {
  user: User | null;
  login: (payload: { email?: string; username?: string; password: string }) => Promise<any>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);

  // Fetch profile khi app mount nếu có token
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        console.log('[AuthProvider] Found accessToken on mount, fetching profile...');
        const res = await authService.getProfile();
        if (mounted) {
          // Redirect to banned page if the account is banned
          if (res?.user?.isBanned) {
            const params = new URLSearchParams();
            if (res.user.bannedReason) params.set('reason', res.user.bannedReason);
            if (res.user.bannedUntil) params.set('until', res.user.bannedUntil);
            window.location.href = `/banned?${params.toString()}`;
            return;
          }
          setUser(res.user || null);
        }
      } catch (err: any) {
        console.error('[AuthProvider] Failed to fetch profile on mount:', err);
        // Preserve previous user on transient network errors
        if (!err?.isNetworkError && mounted) setUser(null);
      }
    };
    init();
    return () => { mounted = false };
  }, []);

  // Lắng nghe thay đổi token (multi-tab hoặc custom event)
  useEffect(() => {
    const handleTokenChange = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setUser(null);
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
      } catch (err: any) {
        console.error('[AuthProvider] Failed to fetch profile after token change:', err);
        if (!err?.isNetworkError) setUser(null);
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
    } catch (err: any) {
      if (!err?.isNetworkError) setUser(null);
    }

    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}