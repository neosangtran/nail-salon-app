import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StaffDetailScreenProps } from '../navigation/types';
import { useStaffMember } from '../hooks/useStaff';
import LoadingView from '../components/LoadingView';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate, getInitials } from '../utils/format';
import type { StaffAppointment } from '../hooks/useStaff';

export default function StaffDetailScreen({ route }: StaffDetailScreenProps) {
  const { staffId } = route.params;
  const { data, isLoading } = useStaffMember(staffId);

  if (isLoading) return <LoadingView message="Loading staff details..." />;
  if (!data) return <LoadingView message="Staff not found" />;

  const { staff, commissionsSummary, stats } = data;
  const appointments = data.appointments ?? stats?.recentAppointments ?? [];

  const renderAppointment = ({ item }: { item: StaffAppointment }) => (
    <View style={styles.apptRow}>
      <View style={styles.apptLeft}>
        <Text style={styles.apptDate}>{formatDate(item.date)}</Text>
        <Text style={styles.apptCustomer} numberOfLines={1}>
          {item.customer?.name ?? '—'}
        </Text>
      </View>
      <View style={styles.apptRight}>
        <StatusBadge status={item.status as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'} />
        <Text style={styles.apptPrice}>{formatCurrency(item.totalPrice)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: staff.isActive ? '#fce7f3' : '#f3f4f6' }]}>
            <Text style={[styles.avatarText, { color: staff.isActive ? '#e11d48' : '#9ca3af' }]}>
              {getInitials(staff.name)}
            </Text>
          </View>
          <Text style={styles.name}>{staff.name}</Text>
          {staff.specialization ? (
            <Text style={styles.specialization}>{staff.specialization}</Text>
          ) : null}
          <View style={[styles.statusPill, { backgroundColor: staff.isActive ? '#d1fae5' : '#fee2e2' }]}>
            <Text style={[styles.statusPillText, { color: staff.isActive ? '#065f46' : '#991b1b' }]}>
              {staff.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Email" value={staff.email} />
            {staff.phone ? <InfoRow label="Phone" value={staff.phone} /> : null}
            {staff.hireDate ? <InfoRow label="Hire Date" value={formatDate(staff.hireDate)} /> : null}
            <InfoRow label="Commission Rate" value={`${staff.commissionRate}%`} />
          </View>
        </View>

        {/* Commission Summary */}
        {commissionsSummary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commission Summary</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatCurrency(commissionsSummary.totalEarned)}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#059669' }]}>
                  {formatCurrency(commissionsSummary.totalPaid)}
                </Text>
                <Text style={styles.statLabel}>Paid</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#dc2626' }]}>
                  {formatCurrency(commissionsSummary.totalUnpaid)}
                </Text>
                <Text style={styles.statLabel}>Unpaid</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Stats from stats object */}
        {stats ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalAppointments}</Text>
                <Text style={styles.statLabel}>Appointments</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#059669' }]}>
                  {formatCurrency(stats.totalCommissionEarned)}
                </Text>
                <Text style={styles.statLabel}>Commission Earned</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Recent Appointments */}
        {appointments.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Appointments</Text>
            <View style={styles.infoCard}>
              <FlatList
                data={appointments.slice(0, 10)}
                keyExtractor={(item) => item.id}
                renderItem={renderAppointment}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.divider} />}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  specialization: { fontSize: 14, color: '#6b7280', marginBottom: 10 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: { fontSize: 13, color: '#9ca3af' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  apptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  apptLeft: { flex: 1 },
  apptDate: { fontSize: 13, fontWeight: '500', color: '#374151' },
  apptCustomer: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  apptRight: { alignItems: 'flex-end', gap: 4 },
  apptPrice: { fontSize: 12, fontWeight: '600', color: '#059669' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
});
