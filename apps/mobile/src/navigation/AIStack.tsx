import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AIScreen from '../screens/AIScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';

const Stack = createNativeStackNavigator();

/** AI Tab 内栈导航，避免跨 Tab 跳转后返回时 MapView 崩溃 */
export function AIStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="AIMain" component={AIScreen} />
      <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}
