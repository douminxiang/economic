import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './navigation/RootNavigator';
import { initAmapGeolocation } from './utils/amapInit';
import { ThemeProvider } from './theme/ThemeContext';
import { ensureI18n } from './i18n';
import { useAuthStore } from './stores/authStore';
import { Loading } from './components/Loading';
import { colors } from './theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const App = () => {
  const bootstrapped = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    ensureI18n();
    useAuthStore.getState().hydrateFromStorage();
    setReady(true);
    initAmapGeolocation().catch(() => {});
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Loading fullScreen />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, backgroundColor: colors.background },
});

export default App;
