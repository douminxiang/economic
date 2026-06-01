import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';
import { connectSocket, disconnectSocket } from '../services/socket';

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};
