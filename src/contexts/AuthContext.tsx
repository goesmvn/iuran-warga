import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AUTH_KEY = 'iuran_auth_user';
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/**
 * Safely parse the stored auth user from localStorage.
 * Returns null if token is missing, malformed, or expired.
 */
function loadStoredUser(): User | null {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as User;
    if (!parsed?.token) return null;

    // Decode JWT payload (base64) to check expiry without a library
    const payloadB64 = parsed.token.split('.')[1];
    if (!payloadB64) return null;
    const payload = JSON.parse(atob(payloadB64));

    // If token has expired, clear storage and treat as logged out
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [user]);

  // Auto-logout when JWT expires (check every minute)
  useEffect(() => {
    if (!user?.token) return;

    const checkExpiry = () => {
      try {
        const payloadB64 = user.token!.split('.')[1];
        const payload = JSON.parse(atob(payloadB64));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    const interval = setInterval(checkExpiry, 60_000); // every 60s
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback((newUser: User) => setUser(newUser), []);
  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
