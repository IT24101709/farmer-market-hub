import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getOrderById, updateOrder } from '../../services/orderService';
import { getDeliveryByOrderId } from '../../services/deliveryService';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      weekday: 'short',
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

const CustomerOrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { token, logout } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      if (!token || !orderId) return;
      const res = await getOrderById(orderId, token);
      setOrder(res.data || null);
    } catch (e) {
      console.error(e);
      if (e.status === 401) logout();
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [orderId, token])
  );

  const cancelOrder = () => {
    Alert.alert('Cancel order', 'Cancel this pending order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await updateOrder(orderId, { status: 'Cancelled' }, token);
            await load();
            Alert.alert('Cancelled', 'Your order was cancelled.');
          } catch (e) {
            Alert.alert('Error', e.message || 'Could not cancel.');
          } finally {
            setBusy(false);
          }
        }
      }
    ]);
  };

  const trackDelivery = async () => {
    setBusy(true);
    try {
      const res = await getDeliveryByOrderId(orderId, token);
      if (res.data?._id) {
        navigation.navigate('DeliveryDetail', { deliveryId: res.data._id });
      }
    } catch (e) {
      Alert.alert('Delivery not ready', e.message || 'Delivery tracking is not available yet.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Order not found.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const trackingSteps = [
    { key: 'Pending', label: 'Placed' },
    { key: 'Processing', label: 'Confirmed' },
    { key: 'Shipped', label: 'Shipped' },
    { key: 'Delivered', label: 'Delivered' }
  ];
  const statusOrder = ['Pending', 'Processing', 'Shipped', 'Delivered'];
  const displayStatus = order.legacyStatus || order.status;
  const currentIdx = statusOrder.indexOf(displayStatus);
  const canTrack = ['CONFIRMED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'Processing', 'Shipped', 'Delivered']
    .includes(order.status) || ['Processing', 'Shipped', 'Delivered'].includes(order.legacyStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Order #{String(order._id).slice(-8).toUpperCase()}</Text>
      <Text style={styles.status}>Status: {displayStatus}</Text>
      <Text style={styles.meta}>Placed: {formatDate(order.createdAt)}</Text>

      {order.status !== 'Cancelled' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          {trackingSteps.map((step) => {
            const stepIdx = statusOrder.indexOf(step.key);
            const done = currentIdx >= stepIdx && stepIdx >= 0;
            return (
              <View key={step.key} style={styles.trackRow}>
                <View style={[styles.dot, done && styles.dotDone]} />
                <Text style={[styles.trackLabel, done && styles.trackLabelDone]}>{step.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {(order.items || []).map((line, idx) => (
          <View key={`${line.stockId}-${idx}`} style={styles.line}>
            <Text style={styles.product}>{line.product}</Text>
            <Text style={styles.lineMeta}>
              {line.quantity} kg × LKR {Number(line.price).toFixed(2)}
              {line.farmerConfirmed ? ' · Farmer confirmed' : ''}
            </Text>
          </View>
        ))}
        <Text style={styles.grand}>Total LKR {Number(order.totalAmount || 0).toFixed(2)}</Text>
      </View>

      {order.status === 'Pending' && (
        <TouchableOpacity
          style={[styles.cancelBtn, busy && styles.disabled]}
          onPress={cancelOrder}
          disabled={busy}
        >
          <Text style={styles.cancelBtnText}>Cancel order</Text>
        </TouchableOpacity>
      )}

      {canTrack && (
        <TouchableOpacity
          style={[styles.trackBtn, busy && styles.disabled]}
          onPress={trackDelivery}
          disabled={busy}
        >
          <Text style={styles.trackBtnText}>Track Delivery</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 18, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  title: { fontSize: 22, fontWeight: '900', color: '#14532d' },
  status: { marginTop: 8, fontSize: 18, fontWeight: '800', color: '#166534' },
  meta: { marginTop: 6, color: '#64748b', fontWeight: '600' },
  section: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 10, textTransform: 'uppercase' },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
    marginRight: 10
  },
  dotDone: { backgroundColor: '#15803d' },
  trackLabel: { color: '#94a3b8', fontWeight: '600' },
  trackLabelDone: { color: '#0f172a', fontWeight: '700' },
  line: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  product: { fontWeight: '800', color: '#111827' },
  lineMeta: { marginTop: 4, color: '#64748b', fontSize: 13, fontWeight: '600' },
  grand: { marginTop: 12, fontWeight: '900', fontSize: 18, color: '#166534' },
  cancelBtn: {
    marginTop: 24,
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  cancelBtnText: { color: '#991b1b', fontWeight: '900' },
  trackBtn: {
    marginTop: 18,
    backgroundColor: '#bbf7d0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  trackBtnText: { color: '#15803d', fontWeight: '900' },
  disabled: { opacity: 0.6 },
  muted: { color: '#64748b', fontWeight: '600' },
  btn: { marginTop: 16, backgroundColor: '#15803d', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '800' }
});

export default CustomerOrderDetailScreen;
