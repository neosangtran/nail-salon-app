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
import { useStaff, type StaffMember } from '../hooks/useStaff';
import type { StaffStackParamList } from '../navigation/types';
import SearchBar from '../components/SearchBar';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { getInitials } from '../utils/format';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffList'>;

export default function StaffScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useStaff({ search, limit: 50 });
  const staff = data?.staff ?? [];

  const renderItem: ListRenderItem<StaffMember> = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('StaffDetail', { staffId: item.id })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: item.isActive ? '#fce7f3' : '#f3f4f6' }]}>
        <Text style={[styles.avatarText, { color: item.isActive ? '#e11d48' : '#9ca3af' }]}>
          {getInitials(item.name)}
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.activeDot, { backgroundColor: item.isActive ? '#10b981' : '#d1d5db' }]} />
        </View>
        {item.specialization ? (
          <Text style={styles.specialization}>{item.specialization}</Text>
        ) : null}
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={styles.commissionBadge}>
        <Text style={styles.commissionText}>{item.commissionRate}%</Text>
        <Text style={styles.commissionLabel}>comm.</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff..."
        />
      </View>

      {isLoading ? (
        <LoadingView message="Loading staff..." />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            staff.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title="No staff found"
              subtitle={search ? 'Try a different search term.' : 'No staff members yet.'}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  specialization: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  email: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  commissionBadge: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 52,
  },
  commissionText: { fontSize: 15, fontWeight: '700', color: '#7c3aed' },
  commissionLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '500' },
});
