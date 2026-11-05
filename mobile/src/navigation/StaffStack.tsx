import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StaffStackParamList } from './types';
import StaffScreen from '../screens/StaffScreen';
import StaffDetailScreen from '../screens/StaffDetailScreen';

const Stack = createNativeStackNavigator<StaffStackParamList>();

export default function StaffStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="StaffList"
        component={StaffScreen}
        options={{ title: 'Staff' }}
      />
      <Stack.Screen
        name="StaffDetail"
        component={StaffDetailScreen}
        options={{ title: 'Staff Details' }}
      />
    </Stack.Navigator>
  );
}
