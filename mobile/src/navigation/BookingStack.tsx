import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BookingStackParamList } from './types';
import BookingsScreen from '../screens/BookingsScreen';
import BookingFormScreen from '../screens/BookingFormScreen';

const Stack = createNativeStackNavigator<BookingStackParamList>();

export default function BookingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="BookingList" component={BookingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingForm" component={BookingFormScreen} options={{ title: 'New Booking' }} />
    </Stack.Navigator>
  );
}
