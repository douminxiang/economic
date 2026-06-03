import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';
import { Screen } from '../components/Screen';
import { disconnectSocket, connectSocket } from '../services/socket';
import { trackPageView } from '../utils/tracker';
import { getActiveRoute, navigationRef } from './navigationRef';
import { useTheme } from '../theme/ThemeContext';
import { colors as tokenColors } from '../theme/tokens';

function routeTrackingKey(route: ReturnType<typeof getActiveRoute>): string | undefined {
  if (!route) return undefined;
  return `${route.name}:${JSON.stringify(route.params ?? {})}`;
}

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const lastTrackedKeyRef = useRef<string | undefined>(undefined);

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    }),
    [colors],
  );

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
    <Screen style={styles.root}>
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onReady={reportScreen}
        onStateChange={reportScreen}
      >
        <View style={styles.navRoot}>
          {isAuthenticated ? <MainTabs /> : <AuthStack />}
        </View>
      </NavigationContainer>
    </Screen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokenColors.background },
  navRoot: { flex: 1 },
});
