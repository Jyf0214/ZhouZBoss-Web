'use client';

import { useState, useEffect, createContext, useContext, useCallback, ReactNode, useRef } from 'react';
import { message } from 'antd';
import { useI18n } from './use-i18n';

export type UserRole = 'user' | 'admin' | 'sudo';

export interface User {
  uid: string;
  email: string;
  name: string;
  displayName: string;
  role: UserRole;
  userGroup?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: UserRole | null;
  isSudo: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clerkAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const clerkAvailable = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (timeoutMs = 10000) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser({ ...data.user, displayName: data.user.name });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        console.warn('Auth refresh timed out');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const login = async (email: string, pass: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email, password: pass }),
      });

      if (res.status === 500) {
        message.error(t('error.500'));
        throw new Error(t('error.500'));
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setUser({ ...data.user, displayName: data.user.name });
        message.success(t('auth.loginSuccess'));
      } else {
        message.error(data.error || t('auth.loginFailed'));
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('登录错误:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, name }),
      });

      if (res.status === 500) {
        message.error(t('error.500'));
        throw new Error(t('error.500'));
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setUser({ ...data.user, displayName: data.user.name });
        message.success(t('auth.registerSuccess'));
      } else {
        message.error(data.error || t('auth.registerFailed'));
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('注册错误:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      message.info(t('common.info'));
    } catch (err) {
      console.error('登出错误:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userRole: user?.role || null,
        isSudo: user?.role === 'sudo' || false,
        login,
        register,
        logout,
        refresh,
        clerkAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return context;
};