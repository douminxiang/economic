import { create } from 'zustand';
import { getStorage } from '../utils/storage';
import api from '../services/api';
import type { User } from '@economic/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrateFromStorage: () => void;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, nickname?: string) => Promise<void>;
  smsLogin: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  hydrateFromStorage: () => {
    const token = getStorage().getString('accessToken');
    set({ isAuthenticated: !!token });
    if (token && !get().user) {
      get().loadUser();
    }
  },

  login: async (phone, password) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/login', { phone, password });
      const { accessToken, refreshToken, user } = res.data;
      getStorage().set('accessToken', accessToken);
      getStorage().set('refreshToken', refreshToken);
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
      getStorage().set('accessToken', accessToken);
      getStorage().set('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  smsLogin: async (phone, code) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/sms-login', { phone, code });
      const { accessToken, refreshToken, user } = res.data;
      getStorage().set('accessToken', accessToken);
      getStorage().set('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    getStorage().remove('accessToken');
    getStorage().remove('refreshToken');
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
