import React, { useCallback, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';
import { disconnectSocket, connectSocket } from '../services/socket';
import { trackPageView } from '../utils/tracker';
import { getActiveRoute, navigationRef } from './navigationRef';

function routeTrackingKey(route: ReturnType<typeof getActiveRoute>): string | undefined {
  if (!route) return undefined;
  return `${route.name}:${JSON.stringify(route.params ?? {})}`;
}

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const lastTrackedKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }
    // 延迟连接，避免启动阶段与 Metro/首屏争抢资源
    const timer = setTimeout(() => connectSocket(), 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    lastTrackedKeyRef.current = undefined;
  }, [isAuthenticated]);

  const reportScreen = useCallback(() => {
    if (!navigationRef.isReady()) return;

    const route = getActiveRoute(navigationRef.getRootState());
    const key = routeTrackingKey(route);
    if (!route || !key || key === lastTrackedKeyRef.current) return;

    lastTrackedKeyRef.current = key;
    trackPageView(route);
  }, []);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={reportScreen}
      onStateChange={reportScreen}
    >
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};
