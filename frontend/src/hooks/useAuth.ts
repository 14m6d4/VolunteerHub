import { createContext, useContext } from 'react';

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

export default useAuth;
