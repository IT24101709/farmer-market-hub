import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { confirmFarmerOrder, getFarmerOrders } from '../../services/farmerService';
import FarmerNavBar from '../../components/FarmerNavBar';

const statusColor = (status) => {
  // Check both new UPPERCASE and legacy status names
  switch (status) {
    case 'PENDING':
    case 'Pending':
      return '#ca8a04';
    case 'CONFIRMED':
    case 'Processing':
      return '#15803d';
    case 'READY_FOR_DELIVERY':
      return '#047857';
    case 'ASSIGNED':
      return '#9333ea';
    case 'IN_TRANSIT':
    case 'Shipped':
      return '#ea580c';
    case 'DELIVERED':
    case 'Delivered':
      return '#15803d';
    case 'CANCELLED':
    case 'Cancelled':
      return '#b91c1c';
    case 'FAILED_DELIVERY':
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

/** Farmer-visible label while order.status can stay PENDING until all farms confirm */
const farmerFacingStatusSummary = (order, farmerId) => {
  const fid = farmerId != null ? String(farmerId) : '';
  const mine =
    fid && Array.isArray(order?.items)
      ? order.items.filter((i) => String(i.farmerId) === fid)
      : [];
  const myConfirmed =
    mine.length > 0 && mine.every((l) => Boolean(l.farmerConfirmed));
  const st = order?.status || 'PENDING';

  switch (st) {
    case 'CANCELLED':
    case 'Cancelled':
      return { label: 'Cancelled', colorKey: 'CANCELLED' };
    case 'FAILED_DELIVERY':
      return { label: 'Failed delivery', colorKey: 'FAILED_DELIVERY' };
    case 'READY_FOR_DELIVERY':
      return { label: 'Ready for delivery', colorKey: 'READY_FOR_DELIVERY' };
    case 'ASSIGNED':
      return { label: 'Agent assigned', colorKey: 'ASSIGNED' };
    case 'IN_TRANSIT':
    case 'Shipped':
      return { label: 'In transit', colorKey: 'IN_TRANSIT' };
    case 'DELIVERED':
    case 'Delivered':
      return { label: 'Delivered', colorKey: 'DELIVERED' };
    case 'CONFIRMED':
    case 'Processing':
      return { label: 'Confirmed by farmer', colorKey: 'CONFIRMED' };
    case 'PENDING':
    case 'Pending':
      return myConfirmed
        ? { label: 'Confirmed by farmer', colorKey: 'CONFIRMED' }
        : { label: 'Order placed', colorKey: 'PENDING' };
    default:
      return { label: String(st || 'PENDING'), colorKey: String(st || 'PENDING') };
  }
};

const MyOrdersScreen = ({ navigation }) => {
  const { token, user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

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

  const showMessage = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(message || title);
      return;
    }
    Alert.alert(title, message);
  };

  const handleConfirm = async (orderId) => {
    if (!token || !orderId) return;

    const run = async () => {
      setConfirmingId(orderId);
      try {
        const res = await confirmFarmerOrder(orderId, token);
        await load();
        showMessage('Confirmed', res.message || 'Your items are confirmed and stock has been reserved.');
      } catch (e) {
        showMessage('Cannot confirm', e.message || 'Stock may have changed. Try again.');
      } finally {
        setConfirmingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Confirm your stock for this order?')) {
        run();
      }
      return;
    }

    Alert.alert('Confirm your stock', 'Confirm and reserve quantity for your items on this order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: run }
    ]);
  };

  const renderOrder = ({ item }) => {
    const sub = farmerSubtotal(item, farmerId);
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    const { label: farmerStatusLabel, colorKey } = farmerFacingStatusSummary(item, farmerId);
    const pillColor = statusColor(colorKey);
    const canConfirm =
      (item.status === 'PENDING' || item.status === 'Pending') &&
      Array.isArray(item.items) &&
      item.items.some((line) => String(line.farmerId) === String(farmerId) && !line.farmerConfirmed);
    const isConfirming = confirmingId === item._id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.orderRef}>Order #{shortId}</Text>
          <View style={[styles.statusPill, { backgroundColor: `${pillColor}22` }]}>
            <Text style={[styles.statusText, { color: pillColor }]}>{farmerStatusLabel}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.yourTotalLabel}>Your items total</Text>
          <Text style={styles.yourTotal}>LKR {sub.toFixed(2)}</Text>
        </View>
        {canConfirm && (
          <TouchableOpacity
            style={[styles.confirmBtn, isConfirming && styles.btnDisabled]}
            onPress={() => handleConfirm(item._id)}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm Order</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
        >
          <Text style={styles.detailBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
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
      <FarmerNavBar navigation={navigation} currentScreen="MyOrders" />
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
  confirmBtn: {
    marginTop: 12,
    backgroundColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  detailBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  detailBtnText: { color: '#15803d', fontWeight: '900', fontSize: 13 },
  btnDisabled: { opacity: 0.65 },
  hint: { marginTop: 10, fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  empty: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#374151' },
  emptyText: { marginTop: 8, textAlign: 'center', color: '#64748b', fontWeight: '600' }
});

export default MyOrdersScreen;
