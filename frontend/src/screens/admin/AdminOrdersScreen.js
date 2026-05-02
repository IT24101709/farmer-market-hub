import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getAdminOrders } from '../../services/adminService';

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

const AdminOrdersScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      if (!token) return;
      const res = await getAdminOrders(token);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      if (e?.status === 401 || e?.response?.status === 401) logout();
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        String(o._id).toLowerCase().includes(q)
    );
  }, [orders, search]);

  const renderItem = ({ item }) => {
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminOrderDetail', { orderId: item._id })}
      >
        <View style={styles.row}>
          <Text style={styles.ref}>#{shortId}</Text>
          <View style={[styles.pill, { backgroundColor: `${statusColor(item.status)}22` }]}>
            <Text style={[styles.pillText, { color: statusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.customer}>{item.customerName}</Text>
        <Text style={styles.amount}>LKR {Number(item.totalAmount || 0).toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search customer name or order id..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#999"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  search: {
    margin: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    fontSize: 15
  },
  list: { paddingHorizontal: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffe0b2',
    elevation: 1
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontWeight: '900', color: '#e65100', fontSize: 16 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  pillText: { fontWeight: '800', fontSize: 12 },
  customer: { marginTop: 8, fontWeight: '700', color: '#424242' },
  amount: { marginTop: 6, fontWeight: '900', color: '#f57c00', fontSize: 18 },
  empty: { textAlign: 'center', color: '#757575', marginTop: 40 }
});

export default AdminOrdersScreen;
