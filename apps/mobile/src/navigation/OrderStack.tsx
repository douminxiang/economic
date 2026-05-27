import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrderScreen from '../screens/OrderScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ReviewSubmitScreen from '../screens/ReviewSubmitScreen';

const Stack = createNativeStackNavigator();

export function OrderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderMain" component={OrderScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
    </Stack.Navigator>
  );
}
