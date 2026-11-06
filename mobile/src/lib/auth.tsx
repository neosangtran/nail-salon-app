import React, { createContext, useContext, useEffect, useState } from 'react';
import { tokenHelpers } from './api';
import api from './api';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, check if we have a stored token and validate it
    const initAuth = async () => {
      try {
        const storedToken = await tokenHelpers.getToken();
        if (storedToken) {
          setToken(storedToken);
          // Try to fetch current user to validate token
          const res = await api.get<{ user: User }>('/auth/me');
          setUser(res.data.user);
        }
      } catch {
        // Token is invalid or expired, clear it
        await tokenHelpers.clearToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    });
    const { accessToken: newToken, user: newUser } = res.data;
    await tokenHelpers.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await tokenHelpers.clearToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
