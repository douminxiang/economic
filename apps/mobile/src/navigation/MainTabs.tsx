import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { HomeStack } from './HomeStack';
import { MapStack } from './MapStack';
import { OrderStack } from './OrderStack';
import AIScreen from '../screens/AIScreen';
import { ProfileStack } from './ProfileStack';
import { fontSize } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        lazy: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: isDark ? '#1E1E1E' : colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: fontSize.xs },
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: t('tabs.home') }} />
      <Tab.Screen name="Map" component={MapStack} options={{ tabBarLabel: t('tabs.map') }} />
      <Tab.Screen name="Order" component={OrderStack} options={{ tabBarLabel: t('tabs.orders') }} />
      <Tab.Screen name="AI" component={AIScreen} options={{ tabBarLabel: t('tabs.ai') }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: t('tabs.profile') }} />
    </Tab.Navigator>
  );
};
