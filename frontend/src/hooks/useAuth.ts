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
        // eslint-disable-next-line no-console
        console.log('[useAuth] Found accessToken on mount, fetching profile...');
        const res = await authService.getProfile();
        if (mounted) {
          setUser(res.user || null);
          // eslint-disable-next-line no-console
          console.log('[useAuth] Profile fetched on mount');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[useAuth] Failed to fetch profile on mount:', err);
        // Don't clear token - might be temp error
        if (mounted) setUser(null);
      }
    };
    init();
    return () => { mounted = false };
  }, []);

  // Listen for changes to accessToken in localStorage (for Google OAuth)
  useEffect(() => {
    const handleStorageChange = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        // eslint-disable-next-line no-console
        console.log('[useAuth] Storage change detected, token exists:', !!token);
        
        if (!token) {
          // eslint-disable-next-line no-console
          console.log('[useAuth] No token, clearing user');
          setUser(null);
          return;
        }
        
        // eslint-disable-next-line no-console
        console.log('[useAuth] Token found, fetching profile...');
        const res = await authService.getProfile();
        // eslint-disable-next-line no-console
        console.log('[useAuth] Profile response:', res);
        
        if (res && res.user) {
          setUser(res.user);
          // eslint-disable-next-line no-console
          console.log('[useAuth] ✓ User state updated:', res.user.username || res.user.email);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[useAuth] ❌ Failed to fetch profile after token change:', err);
        setUser(null);
      }
    };

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event from setAuthToken in same tab
    // eslint-disable-next-line no-console
    console.log('[useAuth] Registering authTokenChanged listener');
    window.addEventListener('authTokenChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authTokenChanged', handleStorageChange);
    };
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
