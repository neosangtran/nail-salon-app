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
import { useGiftCerts, type GiftCert, type GiftCertStatus } from '../hooks/useGiftCerts';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';

type FilterStatus = GiftCertStatus | 'all';

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Depleted', value: 'depleted' },
  { label: 'Expired', value: 'expired' },
];

export default function GiftCertsScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const params =
    filter === 'all'
      ? { search, limit: 50 }
      : { search, status: filter as GiftCertStatus, limit: 50 };

  const { data, isLoading, refetch, isRefetching } = useGiftCerts(params);
  const certs = data?.giftCertificates ?? [];

  const renderItem: ListRenderItem<GiftCert> = ({ item }) => {
    const usedPercent =
      item.originalAmount > 0
        ? Math.max(0, Math.min(100, ((item.originalAmount - item.remainingBalance) / item.originalAmount) * 100))
        : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.code}>{item.code}</Text>
            <Text style={styles.purchaser}>{item.purchaserName}</Text>
            {item.recipientName ? (
              <Text style={styles.recipient}>For: {item.recipientName}</Text>
            ) : null}
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Balance Progress */}
        <View style={styles.balanceSection}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceValue}>
              {formatCurrency(item.remainingBalance)}{' '}
              <Text style={styles.balanceOf}>of {formatCurrency(item.originalAmount)}</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${usedPercent}%` }]}
            />
          </View>
        </View>

        {item.expiresAt ? (
          <Text style={styles.expiry}>Expires: {formatDate(item.expiresAt)}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by code or name..."
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <LoadingView message="Loading gift certificates..." />
      ) : (
        <FlatList
          data={certs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            certs.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="gift"
              title="No gift certificates found"
              subtitle="No certificates match the selected filters."
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  filterText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  filterTextActive: { color: '#ffffff' },
  listContent: { padding: 16, paddingTop: 4 },
  listContentEmpty: { flexGrow: 1 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 8 },
  code: { fontSize: 16, fontWeight: '700', color: '#111827', letterSpacing: 0.5 },
  purchaser: { fontSize: 13, color: '#6b7280', marginTop: 3 },
  recipient: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  balanceSection: { marginBottom: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  balanceLabel: { fontSize: 12, color: '#9ca3af' },
  balanceValue: { fontSize: 13, fontWeight: '700', color: '#059669' },
  balanceOf: { fontSize: 11, fontWeight: '400', color: '#9ca3af' },
  progressBar: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e11d48',
    borderRadius: 3,
  },
  expiry: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
});
