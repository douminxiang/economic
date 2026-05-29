import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './navigation/RootNavigator';
import { initAmapGeolocation } from './utils/amapInit';
import { ThemeProvider } from './theme/ThemeContext';
import { connectSocket, disconnectSocket } from './services/socket';
import './i18n';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initAmapGeolocation();
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
