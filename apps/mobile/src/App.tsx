import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './navigation/RootNavigator';
import { initAmapGeolocation } from './utils/amapInit';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initAmapGeolocation();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
};

export default App;
