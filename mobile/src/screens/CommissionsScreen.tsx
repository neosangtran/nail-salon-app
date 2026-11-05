import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ListRenderItem,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useCommissions, useMarkAsPaid, type Commission } from '../hooks/useCommissions';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatDate, getCurrentPeriod } from '../utils/format';

type FilterPaid = 'all' | 'paid' | 'unpaid';

const FILTERS: { label: string; value: FilterPaid }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
];

export default function CommissionsScreen() {
  const [filter, setFilter] = useState<FilterPaid>('all');
  const period = getCurrentPeriod();

  const params =
    filter === 'all'
      ? { period, limit: 100 }
      : { period, isPaid: filter === 'paid', limit: 100 };

  const { data, isLoading, refetch, isRefetching } = useCommissions(params);
  const markAsPaid = useMarkAsPaid();

  const commissions = data?.commissions ?? [];

  const handlePay = (commission: Commission) => {
    Alert.alert(
      'Mark as Paid',
      `Mark commission of ${formatCurrency(commission.amount)} for ${commission.staff?.name ?? 'staff'} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => markAsPaid.mutate(commission.id),
        },
      ]
    );
  };

  const renderItem: ListRenderItem<Commission> = ({ item }) => {
    const staffName = item.staff?.name ?? item.staffName ?? 'Unknown';
    const appointmentDate = item.appointment?.date ?? item.appointmentDate;
    const serviceName = item.appointment?.service?.name ?? item.serviceName;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.staffName}>{staffName}</Text>
            {serviceName ? (
              <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
            ) : null}
            {appointmentDate ? (
              <Text style={styles.dateText}>{formatDate(appointmentDate)}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.isPaid ? '#d1fae5' : '#fef3c7' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: item.isPaid ? '#065f46' : '#92400e' },
                ]}
              >
                {item.isPaid ? 'Paid' : 'Unpaid'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.rateInfo}>
            <Text style={styles.rateText}>Rate: {(item.rate * 100).toFixed(0)}%</Text>
            {item.period ? (
              <Text style={styles.periodText}>Period: {item.period}</Text>
            ) : null}
          </View>
          {!item.isPaid ? (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => handlePay(item)}
              disabled={markAsPaid.isPending}
            >
              <Feather name="check" size={14} color="#ffffff" />
              <Text style={styles.payButtonText}>Mark Paid</Text>
            </TouchableOpacity>
          ) : (
            item.paidAt ? (
              <Text style={styles.paidAtText}>Paid {formatDate(item.paidAt)}</Text>
            ) : null
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerBar}>
        <Text style={styles.periodLabel}>Period: {period}</Text>
      </View>

      {/* Filter Tabs */}
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
        <LoadingView message="Loading commissions..." />
      ) : (
        <FlatList
          data={commissions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            commissions.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="percent"
              title="No commissions found"
              subtitle="No commission records for the selected period."
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
  headerBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  periodLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
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
    marginBottom: 10,
  },
  headerLeft: { flex: 1, marginRight: 8 },
  staffName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  serviceName: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  dateText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateInfo: { gap: 2 },
  rateText: { fontSize: 12, color: '#6b7280' },
  periodText: { fontSize: 11, color: '#9ca3af' },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  payButtonText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  paidAtText: { fontSize: 11, color: '#9ca3af' },
});
