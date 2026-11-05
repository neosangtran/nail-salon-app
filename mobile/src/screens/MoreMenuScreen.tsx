import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { MoreStackParamList } from '../navigation/types';
import { useAuth } from '../lib/auth';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreMenu'>;

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconColor: string;
  iconBg: string;
  screen: keyof Omit<MoreStackParamList, 'MoreMenu'>;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'revenue',
    title: 'Revenue',
    subtitle: 'Sales reports & analytics',
    icon: 'dollar-sign',
    iconColor: '#059669',
    iconBg: '#d1fae5',
    screen: 'Revenue',
  },
  {
    id: 'supplies',
    title: 'Supplies',
    subtitle: 'Inventory management',
    icon: 'package',
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
    screen: 'Supplies',
  },
  {
    id: 'giftcerts',
    title: 'Gift Certificates',
    subtitle: 'Manage gift cards',
    icon: 'gift',
    iconColor: '#db2777',
    iconBg: '#fce7f3',
    screen: 'GiftCerts',
  },
  {
    id: 'commissions',
    title: 'Commissions',
    subtitle: 'Staff commission tracking',
    icon: 'percent',
    iconColor: '#d97706',
    iconBg: '#fef3c7',
    screen: 'Commissions',
  },
];

export default function MoreMenuScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();

  const renderItem: ListRenderItem<MenuItem> = ({ item }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
        <Feather name={item.icon} size={20} color={item.iconColor} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Feather name="user" size={24} color="#e11d48" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name ?? user?.email ?? 'Manager'}</Text>
          <Text style={styles.userRole}>{user?.role ?? 'Admin'}</Text>
        </View>
      </View>

      <FlatList
        data={MENU_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Feather name="log-out" size={18} color="#dc2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  userRole: { fontSize: 13, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  menuSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 14,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
});
