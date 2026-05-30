import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AddressScreen from '../screens/AddressScreen';
import AddressPickerScreen from '../screens/AddressPickerScreen';
import FavoriteScreen from '../screens/FavoriteScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

const Stack = createNativeStackNavigator();

export const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Address" component={AddressScreen} />
    <Stack.Screen name="AddressPicker" component={AddressPickerScreen} />
    <Stack.Screen name="Favorite" component={FavoriteScreen} />
  </Stack.Navigator>
);
