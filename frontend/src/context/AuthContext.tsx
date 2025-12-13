import { createContext, useState, useEffect, useCallback, useContext, PropsWithChildren } from 'react';
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
          setUser(res.user || null);
        }
      } catch (err) {
        console.error('[AuthProvider] Failed to fetch profile on mount:', err);
        if (mounted) setUser(null);
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
        setUser(res.user || null);
      } catch (err) {
        console.error('[AuthProvider] Failed to fetch profile after token change:', err);
        setUser(null);
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