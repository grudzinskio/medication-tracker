import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAuthToken as syncApiAuthToken, subscribeUnauthorized } from '../services/api';
import type { AuthUser } from './types';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = 'medication-tracker-auth';

function getJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof parsed.exp !== 'number') return null;
    return parsed.exp * 1000;
  } catch {
    return null;
  }
}

function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
    const expMs = getJwtExpMs(parsed.token);
    if (expMs !== null && Date.now() >= expMs) {
      localStorage.removeItem(STORAGE_KEY);
      return { token: null, user: null };
    }
    return { token: parsed.token, user: parsed.user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ token, user }, setAuth] = useState(() => readStoredAuth());

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    // Sync immediately so API calls in child useEffects (they run before App's useEffect) send Bearer.
    syncApiAuthToken(newToken);
    setAuth({ token: newToken, user: newUser });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }));
  }, []);

  const logout = useCallback(() => {
    syncApiAuthToken(null);
    setAuth({ token: null, user: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => subscribeUnauthorized(logout), [logout]);

  const value = useMemo(() => ({ token, user, login, logout }), [token, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

