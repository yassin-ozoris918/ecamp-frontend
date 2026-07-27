import { createContext, useContext, type ReactNode } from 'react';
import { useAuth as useAuthImpl } from './auth';

type AuthValue = ReturnType<typeof useAuthImpl>;

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthImpl();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
