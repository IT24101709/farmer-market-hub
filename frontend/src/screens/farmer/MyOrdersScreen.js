import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getFarmerOrders } from '../../services/farmerService';

const statusColor = (status) => {
  switch (status) {
    case 'Pending':
      return '#ca8a04';
    case 'Processing':
      return '#2563eb';
    case 'Shipped':
      return '#7c3aed';
    case 'Delivered':
      return '#15803d';
    case 'Cancelled':
      return '#b91c1c';
    default:
      return '#64748b';
  }
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

const farmerSubtotal = (order, farmerId) => {
  if (!order?.items?.length || !farmerId) return 0;
  return order.items
    .filter((i) => String(i.farmerId) === String(farmerId))
    .reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0);
};

const MyOrdersScreen = ({ navigation }) => {
  const { token, user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const farmerId = user?.id || user?._id;

  const load = async () => {
    try {
      if (!token) return;
      const data = await getFarmerOrders(token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Farmer orders:', e);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderOrder = ({ item }) => {
    const sub = farmerSubtotal(item, farmerId);
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <Text style={styles.orderRef}>Order #{shortId}</Text>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}22` }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.yourTotalLabel}>Your items total</Text>
          <Text style={styles.yourTotal}>LKR {sub.toFixed(2)}</Text>
        </View>
        <Text style={styles.hint}>Tap to track, confirm, or view full order</Text>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My orders</Text>
        <Text style={styles.subtitle}>From customers who bought your produce</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>When customers checkout your vegetables, orders appear here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  loadingText: { marginTop: 10, color: '#166534', fontWeight: '700' },
  header: {
    backgroundColor: '#15803d',
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 6, fontWeight: '600', fontSize: 14 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRef: { fontSize: 15, fontWeight: '900', color: '#111827' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '900' },
  customerName: { marginTop: 10, fontSize: 17, fontWeight: '800', color: '#1f2937' },
  dateText: { marginTop: 4, color: '#64748b', fontSize: 13, fontWeight: '600' },
  cardBottom: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  yourTotalLabel: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  yourTotal: { fontSize: 18, fontWeight: '900', color: '#15803d' },
  hint: { marginTop: 10, fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  empty: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#374151' },
  emptyText: { marginTop: 8, textAlign: 'center', color: '#64748b', fontWeight: '600' }
});

export default MyOrdersScreen;
