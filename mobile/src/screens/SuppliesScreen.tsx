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
import { useSupplies, useUpdateSupply, type Supply } from '../hooks/useSupplies';
import SearchBar from '../components/SearchBar';
import LoadingView from '../components/LoadingView';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../utils/format';

export default function SuppliesScreen() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch, isRefetching } = useSupplies({ search, limit: 100 });
  const updateSupply = useUpdateSupply();

  const supplies = data?.supplies ?? [];

  const adjustQuantity = (item: Supply, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 0) {
      Alert.alert('Invalid', 'Quantity cannot be negative.');
      return;
    }
    updateSupply.mutate({ id: item.id, payload: { quantity: newQty } });
  };

  const renderItem: ListRenderItem<Supply> = ({ item }) => {
    const isLowStock = item.quantity <= item.reorderLevel;

    return (
      <View style={[styles.card, isLowStock && styles.cardLowStock]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.categoryRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              {isLowStock ? (
                <View style={styles.lowStockBadge}>
                  <Feather name="alert-triangle" size={10} color="#dc2626" />
                  <Text style={styles.lowStockText}>Low Stock</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.costText}>{formatCurrency(item.costPerUnit)}/{item.unit}</Text>
        </View>

        <View style={styles.quantityRow}>
          <View style={styles.quantityInfo}>
            <Text style={[styles.quantityValue, isLowStock && styles.quantityValueLow]}>
              {item.quantity} {item.unit}
            </Text>
            <Text style={styles.reorderLevel}>Reorder at: {item.reorderLevel}</Text>
          </View>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => adjustQuantity(item, -1)}
              disabled={updateSupply.isPending}
            >
              <Feather name="minus" size={16} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qtyButton, styles.qtyButtonPlus]}
              onPress={() => adjustQuantity(item, 1)}
              disabled={updateSupply.isPending}
            >
              <Feather name="plus" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {item.supplier ? (
          <Text style={styles.supplier}>Supplier: {item.supplier}</Text>
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
          placeholder="Search supplies..."
        />
      </View>

      {isLoading ? (
        <LoadingView message="Loading supplies..." />
      ) : (
        <FlatList
          data={supplies}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            supplies.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="package"
              title="No supplies found"
              subtitle={search ? 'Try a different search.' : 'No supplies added yet.'}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLowStock: {
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  categoryRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lowStockText: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  costText: { fontSize: 12, color: '#6b7280' },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityInfo: {},
  quantityValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  quantityValueLow: { color: '#dc2626' },
  reorderLevel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  quantityControls: { flexDirection: 'row', gap: 8 },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonPlus: { backgroundColor: '#e11d48' },
  supplier: { fontSize: 11, color: '#9ca3af', marginTop: 8 },
});
