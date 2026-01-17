import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../lib/storage';
import { api } from '../lib/api';

type User = {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'moderator' | 'admin';
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await storage.getItemAsync('accessToken');
      if (token) {
        const response = await api.get('/api/auth/me');
        setUser(response.data.user);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      await storage.deleteItemAsync('accessToken');
      await storage.deleteItemAsync('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const response = await api.post('/api/auth/login', { email: normalizedEmail, password });
    const { accessToken, refreshToken, user: userData } = response.data;

    await storage.setItemAsync('accessToken', accessToken);
    await storage.setItemAsync('refreshToken', refreshToken);
    setUser(userData);
  }

  async function register(name: string, email: string, password: string) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const normalizedName = typeof name === 'string' ? name.trim() : name;
    const response = await api.post('/api/auth/register', { name: normalizedName, email: normalizedEmail, password });
    const { accessToken, refreshToken, user: userData } = response.data;

    await storage.setItemAsync('accessToken', accessToken);
    await storage.setItemAsync('refreshToken', refreshToken);
    setUser(userData);
  }

  async function logout() {
    try {
      const refreshToken = await storage.getItemAsync('refreshToken');
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      await storage.deleteItemAsync('accessToken');
      await storage.deleteItemAsync('refreshToken');
      setUser(null);
    }
  }

  async function refreshUser() {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.log('Refresh user failed:', error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
