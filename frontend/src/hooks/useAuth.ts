import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuthConfig, type DemoRole } from '@/services/auth.service';

export interface User {
  _id?: string;
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  profilePicture?: string;
  isBanned?: boolean;
  bannedReason?: string;
  bannedUntil?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: { email?: string; username?: string; password: string }) => Promise<unknown>;
  demoLogin: (role: DemoRole) => Promise<unknown>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/** Whether public sign-up is open (backend SIGNUP_ENABLED). False while loading or on error, so links stay hidden. */
export function useSignupEnabled() {
  const { data, isPending } = useQuery({ queryKey: ['auth', 'config'], queryFn: getAuthConfig, staleTime: Infinity });
  return { signupEnabled: data?.signupEnabled === true, loading: isPending };
}

export default useAuth;
