import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { useBookings } from '../hooks/useBookings';
import { useStaff } from '../hooks/useStaff';
import { useCustomers } from '../hooks/useCustomers';
import { useRevenueSummary } from '../hooks/useRevenue';
import KPICard from '../components/KPICard';
import StatusBadge from '../components/StatusBadge';
import LoadingView from '../components/LoadingView';
import { formatCurrency, formatDate, formatTime, getTodayString } from '../utils/format';
import type { Booking } from '../hooks/useBookings';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const today = getTodayString();

  const { data: todayBookings, isLoading: loadingBookings } = useBookings({
    date: today,
    limit: 50,
  });
  const { data: staffData } = useStaff({ isActive: true, limit: 100 });
  const { data: customersData } = useCustomers({ limit: 1 });
  const { data: revenueSummary } = useRevenueSummary('month');

  const todayAppointmentCount = todayBookings?.appointments?.length ?? 0;
  const activeStaffCount = staffData?.pagination?.total ?? 0;
  const monthlyRevenue = revenueSummary?.totalRevenue ?? 0;
  const totalCustomers = customersData?.pagination?.total ?? 0;

  const recentAppointments = (todayBookings?.appointments ?? []).slice(0, 5);

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loadingBookings) {
    return <LoadingView message="Loading dashboard..." />;
  }

  const renderAppointment = ({ item }: { item: Booking }) => (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentLeft}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(item.startTime)}</Text>
        </View>
      </View>
      <View style={styles.appointmentInfo}>
        <Text style={styles.customerName} numberOfLines={1}>
          {item.customer?.name ?? 'Unknown'}
        </Text>
        <Text style={styles.serviceName} numberOfLines={1}>
          {item.service?.name ?? 'Service'} · {item.staff?.name ?? 'Staff'}
        </Text>
      </View>
      <View style={styles.appointmentRight}>
        <StatusBadge status={item.status} />
        <Text style={styles.price}>{formatCurrency(item.totalPrice)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getGreeting()}, {user?.name ?? 'Manager'}</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Feather name="log-out" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* KPI Cards Row 1 */}
        <View style={styles.kpiRow}>
          <KPICard
            title="Today's Appointments"
            value={String(todayAppointmentCount)}
            icon="calendar"
            iconColor="#e11d48"
            iconBg="#fce7f3"
          />
          <View style={styles.kpiSpacer} />
          <KPICard
            title="Month Revenue"
            value={formatCurrency(monthlyRevenue)}
            icon="dollar-sign"
            iconColor="#059669"
            iconBg="#d1fae5"
          />
        </View>

        {/* KPI Cards Row 2 */}
        <View style={[styles.kpiRow, { marginTop: 12 }]}>
          <KPICard
            title="Active Staff"
            value={String(activeStaffCount)}
            icon="users"
            iconColor="#7c3aed"
            iconBg="#ede9fe"
          />
          <View style={styles.kpiSpacer} />
          <KPICard
            title="Total Customers"
            value={String(totalCustomers)}
            icon="user"
            iconColor="#2563eb"
            iconBg="#dbeafe"
          />
        </View>

        {/* Recent Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
            <Text style={styles.sectionCount}>{todayAppointmentCount}</Text>
          </View>

          {recentAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="calendar" size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>No appointments today</Text>
            </View>
          ) : (
            <FlatList
              data={recentAppointments}
              keyExtractor={(item) => item.id}
              renderItem={renderAppointment}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111827' },
  date: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiRow: { flexDirection: 'row' },
  kpiSpacer: { width: 12 },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionCount: {
    backgroundColor: '#fce7f3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#e11d48',
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  appointmentLeft: { marginRight: 12 },
  timeContainer: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  timeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  appointmentInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  serviceName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  appointmentRight: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 13, fontWeight: '600', color: '#059669', marginTop: 4 },
  separator: { height: 8 },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: { fontSize: 14, color: '#9ca3af' },
});
