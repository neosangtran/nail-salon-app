import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CustomerStackParamList } from './types';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';

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
        options={({ navigation }) => ({
          title: 'Customers',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerForm')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Add customer"
            >
              <Feather name="plus" size={24} color="#e11d48" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Customer Details' }}
      />
      <Stack.Screen
        name="CustomerForm"
        component={CustomerFormScreen}
        options={{ title: 'New Customer' }}
      />
    </Stack.Navigator>
  );
}
