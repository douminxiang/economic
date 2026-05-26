import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, register, logout, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      loadUser();
    }
  }, [isAuthenticated]);

  return { user, isAuthenticated, isLoading, login, register, logout };
};
