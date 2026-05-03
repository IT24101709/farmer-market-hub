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
import { getAdminOrders, updateOrderStatus } from '../../services/orderService';

const statusColors = {
  PENDING: '#ca8a04',
  CONFIRMED: '#15803d',
  CANCELLED: '#b91c1c',
  DELIVERED: '#15803d',
  READY_FOR_DELIVERY: '#047857',
  ASSIGNED: '#047857',
  IN_TRANSIT: '#047857',
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

const STATUS_FILTERS = ['All', 'PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];

const AdminOrdersScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);

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

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // Apply status filter
    if (filter !== 'All') {
      result = result.filter(o => o.status === filter);
    }
    
    // Apply search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(o => 
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        String(o._id).toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [orders, search, filter]);

  const handleStatusChange = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      // Normalize to lowercase — backend updateOrderStatus accepts lowercase
      await updateOrderStatus(orderId, newStatus.toLowerCase(), null, token);
      await load();
      if (newStatus === 'CONFIRMED') {
        navigation.navigate('AdminDeliveries');
      }
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
    } finally {
      setActionLoading(null);
    }
  };

  const renderOrder = ({ item }) => {
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    const isPending = item.status === 'PENDING' || item.status === 'Pending';
    const isConfirmed = item.status === 'CONFIRMED' || item.status === 'Confirmed';
    const isLoading = actionLoading === item._id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminOrderDetail', { orderId: item._id })}
        activeOpacity={0.85}
        disabled={isLoading}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{shortId}</Text>
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
        
        <Text style={styles.customer}>{item.customerName}</Text>
        
        <Text style={styles.items} numberOfLines={1}>
          {item.items?.map(i => i.product).join(', ') || 'No items'}
        </Text>
        
        <Text style={styles.total}>
          LKR {Number(item.totalAmount || 0).toFixed(2)}
        </Text>
        
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        
        {isLoading && (
          <ActivityIndicator size="small" color="#15803d" style={styles.actionLoader} />
        )}
        
        {!isLoading && (
          <View style={styles.actions}>
            {isPending && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => handleStatusChange(item._id, 'CONFIRMED')}
              >
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            )}
            
            {(isPending || isConfirmed) && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => handleStatusChange(item._id, 'CANCELLED')}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filter === item && styles.filterChipActive
      ]}
      onPress={() => setFilter(item)}
    >
      <Text style={[
        styles.filterChipText,
        filter === item && styles.filterChipTextActive
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by customer or order ID..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#999"
      />
      
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        renderItem={renderFilter}
        contentContainerStyle={styles.filterList}
        showsHorizontalScrollIndicator={false}
      />
      
      <FlatList
        data={filteredOrders}
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
          <Text style={styles.empty}>No orders found</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  search: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    fontSize: 15
  },
  filterList: { paddingHorizontal: 12, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    marginRight: 8
  },
  filterChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  filterChipText: { color: '#757575', fontWeight: '600', fontSize: 13 },
  filterChipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffe0b2',
    elevation: 1
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '900', color: '#e65100', fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusText: { fontWeight: '800', fontSize: 12 },
  customer: { marginTop: 8, fontWeight: '700', color: '#424242', fontSize: 15 },
  items: { marginTop: 4, color: '#757575', fontSize: 13 },
  total: { marginTop: 8, fontWeight: '900', color: '#f57c00', fontSize: 18 },
  date: { marginTop: 4, color: '#9e9e9e', fontSize: 12 },
  actions: { flexDirection: 'row', marginTop: 12 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  confirmBtn: { backgroundColor: '#e8f5e9' },
  confirmBtnText: { color: '#2e7d32', fontWeight: '700', fontSize: 13 },
  cancelBtn: { backgroundColor: '#ffebee' },
  cancelBtnText: { color: '#c62828', fontWeight: '700', fontSize: 13 },
  actionLoader: { marginTop: 8 },
  empty: { textAlign: 'center', color: '#757575', marginTop: 40 }
});

export default AdminOrdersScreen;
