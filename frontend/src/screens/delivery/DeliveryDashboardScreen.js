import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getDashboard, getTodayDeliveries, updateDeliveryStatus } from '../../services/deliveryService';

const statusColor = (status) => {
  switch (status) {
    case 'Pending': return '#ca8a04';
    case 'In Transit': return '#2563eb';
    case 'Delivered': return '#15803d';
    case 'Cancelled': return '#b91c1c';
    default: return '#64748b';
  }
};

const DeliveryDashboardScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [dashboard, setDashboard] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try {
      if (!token) return;
      const dashRes = await getDashboard(token);
      setDashboard(dashRes.data);
      
      const todayRes = await getTodayDeliveries(token);
      setDeliveries(todayRes.data?.deliveries || []);
    } catch (e) {
      console.error(e);
      if (e.status === 401) logout();
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

  const handleStatusUpdate = async (deliveryId, itemId, newStatus) => {
    setUpdating(true);
    try {
      await updateDeliveryStatus(deliveryId, itemId, { status: newStatus }, token);
      await load();
      Alert.alert('Success', `Order marked as ${newStatus}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const renderDelivery = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{String(item.orderId).slice(-8).toUpperCase()}</Text>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}22` }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.customerName}>{item.customerName}</Text>
      <Text style={styles.address}>{item.customerAddress || 'Address not provided'}</Text>
      <Text style={styles.items}>{item.items}</Text>
      <Text style={styles.amount}>LKR {Number(item.amount || 0).toFixed(2)}</Text>
      
      <View style={styles.actions}>
        {item.status === 'Pending' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
            onPress={() => handleStatusUpdate(item._id, item._id, 'In Transit')}
            disabled={updating}
          >
            <Text style={styles.actionBtnText}>Start Delivery</Text>
          </TouchableOpacity>
        )}
        {item.status === 'In Transit' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#15803d' }]}
            onPress={() => handleStatusUpdate(item._id, item._id, 'Delivered')}
            disabled={updating}
          >
            <Text style={styles.actionBtnText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
        {item.status === 'In Transit' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn, { backgroundColor: '#b91c1c' }]}
            onPress={() => handleStatusUpdate(item._id, item._id, 'Cancelled')}
            disabled={updating}
          >
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{dashboard?.pendingCount || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{dashboard?.inTransitCount || 0}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#15803d' }]}>{dashboard?.deliveredCount || 0}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id || String(item.orderId)}
        renderItem={renderDelivery}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No deliveries assigned today.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' },
  loadingText: { marginTop: 10, color: '#0369a1', fontWeight: '700' },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe'
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#ca8a04' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 16, fontWeight: '900', color: '#0c4a6e' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '800', fontSize: 12 },
  customerName: { marginTop: 10, fontSize: 16, fontWeight: '700', color: '#333' },
  address: { marginTop: 4, fontSize: 14, color: '#64748b' },
  items: { marginTop: 8, fontSize: 14, color: '#475569' },
  amount: { marginTop: 8, fontSize: 18, fontWeight: '900', color: '#0369a1' },
  actions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#b91c1c' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40, fontWeight: '600', paddingHorizontal: 24 }
});

export default DeliveryDashboardScreen;
