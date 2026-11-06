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
import { Feather } from '@expo/vector-icons';
import type { BookingListScreenProps } from '../navigation/types';
import { useBookings, type Booking, type BookingStatus } from '../hooks/useBookings';
import StatusBadge from '../components/StatusBadge';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

type FilterStatus = BookingStatus | 'all';

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function BookingsScreen({ navigation }: BookingListScreenProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const params = filter === 'all' ? { limit: 50 } : { status: filter as BookingStatus, limit: 50 };
  const { data, isLoading, refetch, isRefetching } = useBookings(params);

  const appointments = data?.appointments ?? [];

  const renderItem: ListRenderItem<Booking> = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('BookingForm', { bookingId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.customerName}>{item.customer?.name ?? 'Unknown'}</Text>
          <Text style={styles.dateText}>
            {formatDate(item.date)} · {formatTime(item.startTime)}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Service</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.service?.name ?? '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Staff</Text>
          <Text style={styles.infoValue}>{item.staff?.name ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Price</Text>
          <Text style={[styles.infoValue, styles.priceValue]}>
            {formatCurrency(item.totalPrice)}
          </Text>
        </View>
        {item.tip != null && item.tip > 0 ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tip</Text>
            <Text style={styles.infoValue}>{formatCurrency(item.tip)}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.count}>{appointments.length} records</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('BookingForm')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color="#ffffff" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item.value && styles.filterChipActive]}
              onPress={() => setFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <LoadingView message="Loading bookings..." />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            appointments.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title="No bookings found"
              subtitle="There are no appointments matching the selected filter."
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  count: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e11d48',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  filterContainer: { paddingBottom: 8 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  filterChipTextActive: { color: '#ffffff' },
  listContent: { padding: 16 },
  listContentEmpty: { flexGrow: 1 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  dateText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardBody: { gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 12, color: '#9ca3af', flex: 1 },
  infoValue: { fontSize: 12, color: '#374151', fontWeight: '500', flex: 2, textAlign: 'right' },
  priceValue: { color: '#059669', fontWeight: '600' },
});
