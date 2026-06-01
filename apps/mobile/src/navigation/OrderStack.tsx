import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrderScreen from '../screens/OrderScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ReviewSubmitScreen from '../screens/ReviewSubmitScreen';
import PaymentScreen from '../screens/PaymentScreen';

const Stack = createNativeStackNavigator();

export function OrderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderMain" component={OrderScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
    </Stack.Navigator>
  );
}
