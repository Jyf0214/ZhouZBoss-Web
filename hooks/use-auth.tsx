'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { message } from 'antd';

/**
 * Originium Kernel Authentication Hook (Frontend)
 * Calls Backend APIs at /api/auth/*
 */

export type UserRole = 'user' | 'admin' | 'sudo';

export interface User {
  uid: string;
  email: string;
  name: string;
  displayName: string; // Map name to displayName
  role: UserRole;
  userGroup?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser({
            ...data.user,
            displayName: data.user.name
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, pass: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser({
          ...data.user,
          displayName: data.user.name
        });
        message.success('登录成功');
      } else {
        message.error(data.error || '登录失败');
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Login error:', err);
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

      const data = await res.json();
      if (res.ok && data.success) {
        setUser({
          ...data.user,
          displayName: data.user.name
        });
        message.success('注册成功');
      } else {
        message.error(data.error || '注册失败');
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Register error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      message.info('已登出');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      userRole: user?.role || null,
      isSudo: user?.role === 'sudo' || false,
      login,
      register,
      logout,
      refresh
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Compatibility export
export const useFirebase = useAuth;
