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
import { getMyOrders } from '../../services/orderService';

const statusColor = (status) => {
  switch (status) {
    case 'Pending':
      return '#ca8a04';
    case 'Processing':
      return '#15803d';
    case 'Shipped':
      return '#047857';
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

const CustomerOrdersScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      if (!token) return;
      const res = await getMyOrders(token);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      if (e.status === 401) logout();
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

  const renderOrder = ({ item }) => {
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CustomerOrderDetail', { orderId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <Text style={styles.orderRef}>#{shortId}</Text>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}22` }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.total}>LKR {Number(item.totalAmount || 0).toFixed(2)}</Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.hint}>Tap for details · cancel while pending</Text>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No orders yet. Browse the marketplace and checkout from your cart.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  loadingText: { marginTop: 10, color: '#166534', fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRef: { fontSize: 16, fontWeight: '900', color: '#14532d' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '800', fontSize: 12 },
  total: { marginTop: 10, fontSize: 20, fontWeight: '900', color: '#166534' },
  dateText: { marginTop: 6, color: '#64748b', fontWeight: '600' },
  hint: { marginTop: 10, fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40, fontWeight: '600', paddingHorizontal: 24 }
});

export default CustomerOrdersScreen;
