import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/api';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, register, smsLogin, logout, loadUser, updateUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      loadUser();
    }
  }, [isAuthenticated, user, loadUser]);

  const sendCode = async (phone: string) => {
    const res: any = await authApi.sendCode(phone);
    return res.data;
  };

  return { user, isAuthenticated, isLoading, login, register, smsLogin, sendCode, logout, updateUser };
};
