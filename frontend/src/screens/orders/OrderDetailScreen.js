import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getOrderById, cancelOrder as cancelOrderApi } from '../../services/orderService';

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

const statusColors = {
  PENDING: '#ca8a04',
  CONFIRMED: '#15803d',
  CANCELLED: '#b91c1c',
  DELIVERED: '#2563eb',
  Pending: '#ca8a04',
  Confirmed: '#15803d',
  Cancelled: '#b91c1c',
  Delivered: '#2563eb'
};

const getStatusColor = (status) => statusColors[status] || '#64748b';

const OrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { token, logout } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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

  const handleCancel = () => {
    const isPendingStatus = order?.status === 'PENDING' || order?.status === 'Pending';
    if (!isPendingStatus) {
      const msg = 'Only pending orders can be cancelled.';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Cannot Cancel', msg);
      return;
    }

    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to cancel this order?')) return;
      setCancelling(true);
      cancelOrderApi(orderId, token)
        .then(async () => {
          window.alert('Order cancelled.');
          await load();
        })
        .catch((e) => window.alert('Error: ' + (e.message || 'Could not cancel order.')))
        .finally(() => setCancelling(false));
      return;
    }

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelOrderApi(orderId, token);
              Alert.alert('Success', 'Order cancelled.');
              await load();
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not cancel order.');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Order not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = order.status === 'PENDING' || order.status === 'Pending';
  const shortId = order._id ? String(order._id).slice(-8).toUpperCase() : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Order #{shortId}</Text>
      
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status:</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: `${getStatusColor(order.status)}22` }
        ]}>
          <Text style={[
            styles.statusText, 
            { color: getStatusColor(order.status) }
          ]}>
            {order.status || 'Pending'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.meta}>Placed: {formatDate(order.createdAt)}</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {(order.items || []).map((item, idx) => (
          <View key={`${item.stockId}-${idx}`} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} kg × LKR {Number(item.price).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>
              LKR {(item.quantity * item.price).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <Text style={styles.grandTotal}>
          Total: LKR {Number(order.totalAmount || 0).toFixed(2)}
        </Text>
      </View>
      
      {order.deliveryAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addressText}>{order.deliveryAddress}</Text>
        </View>
      )}
      
      {order.note && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note</Text>
          <Text style={styles.noteText}>{order.note}</Text>
        </View>
      )}
      
      {isPending && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <ActivityIndicator color="#991b1b" />
          ) : (
            <Text style={styles.cancelBtnText}>Cancel Order</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  content: { padding: 18, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' },
  title: { fontSize: 22, fontWeight: '900', color: '#0c4a6e' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  statusLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginRight: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '800', fontSize: 13 },
  meta: { marginTop: 8, color: '#64748b', fontWeight: '600' },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '700', color: '#111827', fontSize: 15 },
  itemMeta: { marginTop: 4, color: '#64748b', fontSize: 13 },
  itemTotal: { fontWeight: '800', color: '#0369a1', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  grandTotal: { fontWeight: '900', fontSize: 18, color: '#0369a1', textAlign: 'right' },
  addressText: { color: '#374151', fontWeight: '600', lineHeight: 22 },
  noteText: { color: '#64748b', fontWeight: '600', fontStyle: 'italic' },
  cancelBtn: {
    marginTop: 24,
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { color: '#991b1b', fontWeight: '900' },
  muted: { color: '#64748b', fontWeight: '600' },
  backBtn: { marginTop: 16, backgroundColor: '#2196F3', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '800' }
});

export default OrderDetailScreen;
