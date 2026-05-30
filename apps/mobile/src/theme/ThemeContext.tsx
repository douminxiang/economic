import React, { createContext, useContext, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { getStorage } from '../utils/storage';
import { lightColors, darkColors, ColorScheme } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = getStorage().getString('themeMode');
    return (saved as ThemeMode) || 'system';
  });

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    getStorage().set('themeMode', mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
