import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { CustomerDetailScreenProps } from '../navigation/types';
import { useCustomer, useCustomerVisits } from '../hooks/useCustomers';
import type { CustomerVisit } from '../hooks/useCustomers';
import LoadingView from '../components/LoadingView';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate, getInitials } from '../utils/format';

export default function CustomerDetailScreen({ route, navigation }: CustomerDetailScreenProps) {
  const { customerId } = route.params;
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: visitsData } = useCustomerVisits(customerId);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        customer ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerForm', { customerId })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.headerAction}>Edit</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, customer, customerId]);

  if (isLoading) return <LoadingView message="Loading customer details..." />;
  if (!customer) return <LoadingView message="Customer not found" />;

  const visits = visitsData?.visits ?? [];

  const renderVisit = ({ item }: { item: CustomerVisit }) => (
    <View style={styles.visitRow}>
      <View style={styles.visitLeft}>
        <Text style={styles.visitDate}>{formatDate(item.date)}</Text>
        {item.staffName ? <Text style={styles.visitStaff}>{item.staffName}</Text> : null}
        {item.serviceName ? (
          <Text style={styles.visitServices} numberOfLines={1}>
            {item.serviceName}
          </Text>
        ) : null}
      </View>
      <View style={styles.visitRight}>
        <StatusBadge status={item.status} />
        <Text style={styles.visitPrice}>{formatCurrency(item.totalPrice)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
          </View>
          <Text style={styles.name}>{customer.name}</Text>
          {customer.loyaltyPoints > 0 ? (
            <View style={styles.loyaltyRow}>
              <Feather name="star" size={14} color="#f59e0b" />
              <Text style={styles.loyaltyText}>{customer.loyaltyPoints} loyalty points</Text>
            </View>
          ) : null}
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            {customer.phone ? <InfoRow label="Phone" value={customer.phone} /> : null}
            {customer.email ? <InfoRow label="Email" value={customer.email} /> : null}
            {customer.birthday ? <InfoRow label="Birthday" value={formatDate(customer.birthday)} /> : null}
            {customer.lastVisitDate ? (
              <InfoRow label="Last Visit" value={formatDate(customer.lastVisitDate)} />
            ) : null}
            {customer.createdAt ? (
              <InfoRow label="Member Since" value={formatDate(customer.createdAt)} />
            ) : null}
          </View>
        </View>

        {/* Notes */}
        {customer.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{customer.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Visit History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Visit History</Text>
            <Text style={styles.sectionCount}>{visits.length}</Text>
          </View>
          {visits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No visits recorded yet</Text>
            </View>
          ) : (
            <View style={styles.infoCard}>
              <FlatList
                data={visits.slice(0, 20)}
                keyExtractor={(item) => item.id}
                renderItem={renderVisit}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.divider} />}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: { fontSize: 16, fontWeight: '600', color: '#e11d48', paddingHorizontal: 4 },
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
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#7c3aed' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  loyaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loyaltyText: { fontSize: 13, fontWeight: '600', color: '#d97706' },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sectionCount: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
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
  notesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  notesText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: { fontSize: 13, color: '#9ca3af' },
  visitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  visitLeft: { flex: 1, marginRight: 8 },
  visitDate: { fontSize: 13, fontWeight: '500', color: '#374151' },
  visitStaff: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  visitServices: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  visitRight: { alignItems: 'flex-end', gap: 4 },
  visitPrice: { fontSize: 12, fontWeight: '600', color: '#059669' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
});
