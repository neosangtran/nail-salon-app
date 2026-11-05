import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useCustomers, type Customer } from '../hooks/useCustomers';
import type { CustomerStackParamList } from '../navigation/types';
import SearchBar from '../components/SearchBar';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { getInitials, formatDate } from '../utils/format';

type Nav = NativeStackNavigationProp<CustomerStackParamList, 'CustomerList'>;

export default function CustomersScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useCustomers({ search, limit: 50 });
  const customers = data?.customers ?? [];

  const renderItem: ListRenderItem<Customer> = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.phone ? (
          <View style={styles.phoneRow}>
            <Feather name="phone" size={11} color="#9ca3af" />
            <Text style={styles.phone}>{item.phone}</Text>
          </View>
        ) : null}
        {item.lastVisitDate ? (
          <Text style={styles.lastVisit}>Last visit: {formatDate(item.lastVisitDate)}</Text>
        ) : null}
      </View>
      {item.loyaltyPoints > 0 ? (
        <View style={styles.loyaltyBadge}>
          <Feather name="star" size={12} color="#f59e0b" />
          <Text style={styles.loyaltyPoints}>{item.loyaltyPoints}</Text>
          <Text style={styles.loyaltyLabel}>pts</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search customers..."
        />
      </View>

      {isLoading ? (
        <LoadingView message="Loading customers..." />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            customers.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="user"
              title="No customers found"
              subtitle={search ? 'Try a different search term.' : 'No customers added yet.'}
            />
          }
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8 },
  listContent: { padding: 16, paddingTop: 4 },
  listContentEmpty: { flexGrow: 1 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#7c3aed' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phone: { fontSize: 12, color: '#6b7280' },
  lastVisit: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  loyaltyPoints: { fontSize: 14, fontWeight: '700', color: '#d97706' },
  loyaltyLabel: { fontSize: 10, color: '#d97706', fontWeight: '500' },
});
