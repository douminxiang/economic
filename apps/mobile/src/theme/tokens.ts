export const lightColors = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  secondary: '#004E89',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E5E5',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
  star: '#FFC107',
  overlayDark: '#00000066',
  headerDark: '#444444',
};

export const darkColors = {
  primary: '#FF8F65',
  primaryLight: '#FFB08A',
  secondary: '#5B9BD5',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#F0F0F0',
  textSecondary: '#AAAAAA',
  textLight: '#777777',
  border: '#333333',
  success: '#66BB6A',
  error: '#EF5350',
  warning: '#FFA726',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.7)',
  star: '#FFD54F',
  overlayDark: '#00000099',
  headerDark: '#2A2A2A',
};

export type ColorScheme = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
};

// Legacy export for backward compatibility during migration
export const colors = lightColors;
