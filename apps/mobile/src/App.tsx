import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './navigation/RootNavigator';
import { initAmapGeolocation } from './utils/amapInit';
import { ThemeProvider } from './theme/ThemeContext';
import { ensureI18n } from './i18n';
import { useAuthStore } from './stores/authStore';
import { Loading } from './components/Loading';

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
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    ensureI18n();
    useAuthStore.getState().hydrateFromStorage();
    setReady(true);
    initAmapGeolocation();
  }, []);

  if (!ready) {
    return <Loading fullScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
