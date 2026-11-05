import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CustomerStackParamList } from './types';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';

const Stack = createNativeStackNavigator<CustomerStackParamList>();

export default function CustomerStack() {
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
        name="CustomerList"
        component={CustomersScreen}
        options={{ title: 'Customers' }}
      />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Customer Details' }}
      />
    </Stack.Navigator>
  );
}
