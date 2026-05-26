import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import api from '../services/api';
import type { User, AuthResponse } from '@economic/shared';

const storage = createMMKV();

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, nickname?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!storage.getString('accessToken'),
  isLoading: false,

  login: async (phone, password) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/login', { phone, password });
      const { accessToken, refreshToken, user } = res.data;
      storage.set('accessToken', accessToken);
      storage.set('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (phone, password, nickname) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/register', { phone, password, nickname });
      const { accessToken, refreshToken, user } = res.data;
      storage.set('accessToken', accessToken);
      storage.set('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    storage.remove('accessToken');
    storage.remove('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const res: any = await api.get('/users/me');
      set({ user: res.data });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  updateUser: async (data) => {
    const res: any = await api.patch('/users/me', data);
    set({ user: res.data });
  },
}));
