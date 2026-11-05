import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MoreStackParamList } from './types';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import RevenueScreen from '../screens/RevenueScreen';
import SuppliesScreen from '../screens/SuppliesScreen';
import GiftCertsScreen from '../screens/GiftCertsScreen';
import CommissionsScreen from '../screens/CommissionsScreen';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStack() {
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
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ title: 'More' }}
      />
      <Stack.Screen
        name="Revenue"
        component={RevenueScreen}
        options={{ title: 'Revenue' }}
      />
      <Stack.Screen
        name="Supplies"
        component={SuppliesScreen}
        options={{ title: 'Supplies' }}
      />
      <Stack.Screen
        name="GiftCerts"
        component={GiftCertsScreen}
        options={{ title: 'Gift Certificates' }}
      />
      <Stack.Screen
        name="Commissions"
        component={CommissionsScreen}
        options={{ title: 'Commissions' }}
      />
    </Stack.Navigator>
  );
}
