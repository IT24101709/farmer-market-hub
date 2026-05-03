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

const statusColors = {
  PENDING: '#ca8a04',
  CONFIRMED: '#15803d',
  CANCELLED: '#b91c1c',
  DELIVERED: '#15803d',
  Pending: '#ca8a04',
  Confirmed: '#15803d',
  Cancelled: '#b91c1c',
  Delivered: '#15803d'
};

const getStatusColor = (status) => statusColors[status] || '#64748b';

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

const MyOrdersScreen = ({ navigation }) => {
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
    const itemsSummary = item.items?.length 
      ? item.items.map(i => i.product).join(', ') 
      : 'No items';
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderRef}>#{shortId}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: `${getStatusColor(item.status)}22` }
          ]}>
            <Text style={[
              styles.statusText, 
              { color: getStatusColor(item.status) }
            ]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.items} numberOfLines={2}>{itemsSummary}</Text>
        
        <Text style={styles.total}>
          LKR {Number(item.totalAmount || 0).toFixed(2)}
        </Text>
        
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
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
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); load(); }} 
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No orders yet. Browse the marketplace to place your first order!
          </Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRef: { fontSize: 16, fontWeight: '900', color: '#14532d' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '800', fontSize: 12 },
  items: { marginTop: 10, color: '#374151', fontWeight: '600' },
  total: { marginTop: 10, fontSize: 20, fontWeight: '900', color: '#166534' },
  date: { marginTop: 6, color: '#64748b', fontWeight: '600', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40, fontWeight: '600', paddingHorizontal: 24 }
});

export default MyOrdersScreen;
