import React, { createContext, useContext, useMemo, useState } from 'react';
import { setAuthToken as syncApiAuthToken } from '../services/api';
import type { AuthUser } from './types';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = 'medication-tracker-auth';

function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
    return { token: parsed.token, user: parsed.user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ token, user }, setAuth] = useState(() => readStoredAuth());

  const login = (newToken: string, newUser: AuthUser) => {
    // Sync immediately so API calls in child useEffects (they run before App's useEffect) send Bearer.
    syncApiAuthToken(newToken);
    setAuth({ token: newToken, user: newUser });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }));
  };

  const logout = () => {
    syncApiAuthToken(null);
    setAuth({ token: null, user: null });
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ token, user, login, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

