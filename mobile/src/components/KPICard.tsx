import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface KPICardProps {
  title: string;
  value: string;
  icon: FeatherIconName;
  iconColor?: string;
  iconBg?: string;
  subtitle?: string;
}

export default function KPICard({
  title,
  value,
  icon,
  iconColor = '#e11d48',
  iconBg = '#fce7f3',
  subtitle,
}: KPICardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
});
