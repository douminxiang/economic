import { create } from 'zustand';
import { Alert } from 'react-native';
import { getStorage } from '../utils/storage';
import { getAuthDevicePayload } from '../utils/device';
import api from '../services/api';
import { reconnectSocket, disconnectSocket, setupSessionRevokedListener } from '../services/socket';
import type { User } from '@economic/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionRevokedMessage: string | null;
  hydrateFromStorage: () => void;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, nickname?: string) => Promise<void>;
  smsLogin: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: (message?: string) => void;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const persistTokens = (accessToken: string, refreshToken: string, sessionId?: string) => {
  getStorage().set('accessToken', accessToken);
  getStorage().set('refreshToken', refreshToken);
  if (sessionId) {
    getStorage().set('sessionId', sessionId);
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  sessionRevokedMessage: null,

  hydrateFromStorage: () => {
    const token = getStorage().getString('accessToken');
    set({ isAuthenticated: !!token });
    setupSessionRevokedListener((reason) => {
      const message =
        reason === 'logged_in_elsewhere'
          ? '账号已在其他设备登录，请重新登录'
          : '登录状态已失效，请重新登录';
      get().forceLogout(message);
    });
    if (token && !get().user) {
      get().loadUser();
    }
  },

  login: async (phone, password) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/login', {
        phone,
        password,
        ...getAuthDevicePayload(),
      });
      const { accessToken, refreshToken, sessionId, user } = res.data;
      persistTokens(accessToken, refreshToken, sessionId);
      set({ user, isAuthenticated: true, isLoading: false, sessionRevokedMessage: null });
      reconnectSocket();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (phone, password, nickname) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/register', {
        phone,
        password,
        nickname,
        ...getAuthDevicePayload(),
      });
      const { accessToken, refreshToken, sessionId, user } = res.data;
      persistTokens(accessToken, refreshToken, sessionId);
      set({ user, isAuthenticated: true, isLoading: false, sessionRevokedMessage: null });
      reconnectSocket();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  smsLogin: async (phone, code) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/sms-login', {
        phone,
        code,
        ...getAuthDevicePayload(),
      });
      const { accessToken, refreshToken, sessionId, user } = res.data;
      persistTokens(accessToken, refreshToken, sessionId);
      set({ user, isAuthenticated: true, isLoading: false, sessionRevokedMessage: null });
      reconnectSocket();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = getStorage().getString('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // ignore network errors during logout
    }
    get().forceLogout();
  },

  forceLogout: (message) => {
    getStorage().remove('accessToken');
    getStorage().remove('refreshToken');
    getStorage().remove('sessionId');
    set({ user: null, isAuthenticated: false, sessionRevokedMessage: message ?? null });
    disconnectSocket();
    if (message) {
      Alert.alert('提示', message);
    }
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
