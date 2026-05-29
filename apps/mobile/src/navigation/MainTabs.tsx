import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { HomeStack } from './HomeStack';
import { MapStack } from './MapStack';
import { OrderStack } from './OrderStack';
import AIScreen from '../screens/AIScreen';
import { ProfileStack } from './ProfileStack';
import { colors, fontSize } from '../theme/tokens';

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
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
