'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { UserRole } from '@ecommerce/shared-types';
import { apiClient, setTokens, clearTokens, getRefreshToken } from '../api/api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  emailVerified: boolean;
  vendorId?: string;
  isActive: boolean;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Share a single in-flight refresh promise so React strict mode double-mount
  // reuses the same request instead of firing a second one (which would 401
  // because token rotation revokes the old refresh token on use).
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refreshUser = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          setUser(null);
          return;
        }

        const response = await apiClient.post<{ data: AuthResponse }>('/auth/refresh', {
          refreshToken,
        });
        const data = response.data.data || (response.data as unknown as AuthResponse);
        setTokens(data.accessToken, data.refreshToken);
        setUser(data.user);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/login', {
      email,
      password,
    });
    const data = response.data.data || (response.data as unknown as AuthResponse);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (registerData: RegisterData) => {
    const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', registerData);
    const data = response.data.data || (response.data as unknown as AuthResponse);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Logout even if API call fails
    }
    clearTokens();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

