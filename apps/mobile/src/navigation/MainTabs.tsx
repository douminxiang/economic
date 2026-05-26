import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStack } from './HomeStack';
import { MapStack } from './MapStack';
import OrderScreen from '../screens/OrderScreen';
import AIScreen from '../screens/AIScreen';
import { ProfileStack } from './ProfileStack';
import { colors, fontSize } from '../theme/tokens';

const Tab = createBottomTabNavigator();

export const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textLight,
      tabBarLabelStyle: { fontSize: fontSize.xs },
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: '首页' }} />
    <Tab.Screen name="Map" component={MapStack} options={{ tabBarLabel: '地图' }} />
    <Tab.Screen name="Order" component={OrderScreen} options={{ tabBarLabel: '订单' }} />
    <Tab.Screen name="AI" component={AIScreen} options={{ tabBarLabel: 'AI助手' }} />
    <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: '我的' }} />
  </Tab.Navigator>
);
