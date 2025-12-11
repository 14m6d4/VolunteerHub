import { createContext, type ReactNode } from 'react';

export interface AuthContextType {
  user: any | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider: Wraps the app to provide auth context.
 * This is a simple wrapper that can be extended if needed.
 * The actual auth state is managed by the useAuth hook.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Note: In practice, the actual auth state comes from useAuth hook in individual components.
  // This provider exists for compatibility with components that expect a Context.
  // If you need to share state, consider using the useAuth hook directly in your components.
  
  const contextValue: AuthContextType = {
    user: null,
    logout: () => {},
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
