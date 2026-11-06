import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type StatusType = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show' | 'active' | 'depleted' | 'expired' | 'paid' | 'unpaid';

interface StatusBadgeProps {
  // API values may be upper-case (e.g. "PENDING"); they are matched case-insensitively.
  status: StatusType | string;
  label?: string;
}

const STATUS_COLORS: Record<StatusType, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
  'no-show': { bg: '#f3f4f6', text: '#374151' },
  active: { bg: '#d1fae5', text: '#065f46' },
  depleted: { bg: '#fee2e2', text: '#991b1b' },
  expired: { bg: '#f3f4f6', text: '#374151' },
  paid: { bg: '#d1fae5', text: '#065f46' },
  unpaid: { bg: '#fef3c7', text: '#92400e' },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/_/g, '-') as StatusType;
  const colors = STATUS_COLORS[key] ?? { bg: '#f3f4f6', text: '#374151' };
  const displayLabel = label ?? key.charAt(0).toUpperCase() + key.slice(1);

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
