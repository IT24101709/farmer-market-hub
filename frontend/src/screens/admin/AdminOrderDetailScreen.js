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
import { getOrderById, updateOrderStatus, deleteOrder } from '../../services/orderService';

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'READY_FOR_DELIVERY',
  'ASSIGNED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'FAILED_DELIVERY'
];

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const AdminOrderDetailScreen = ({ route, navigation }) => {
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

  const setStatus = (status) => {
    Alert.alert('Update order', `Set status to ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          setBusy(true);
          try {
            await updateOrderStatus(orderId, status, null, token);
            await load();
            if (status === 'READY_FOR_DELIVERY') {
              navigation.navigate('AdminDeliveries');
            }
          } catch (e) {
            Alert.alert('Error', e.message || 'Update failed');
          } finally {
            setBusy(false);
          }
        }
      }
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Order', 'Are you sure you want to permanently delete this order? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteOrder(orderId, token);
            Alert.alert('Success', 'Order deleted');
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.message || 'Delete failed');
            setBusy(false);
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text>Order not found</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Order #{String(order._id).slice(-8).toUpperCase()}</Text>

      <View style={styles.infoCard}>
        <Text style={styles.line}>Customer: {order.customerName}</Text>
        <Text style={styles.line}>Email: {order.customerId?.email || '-'}</Text>
        <Text style={styles.line}>Current status: {order.status}</Text>
        <Text style={styles.line}>Total: LKR {Number(order.totalAmount || 0).toFixed(2)}</Text>
        <Text style={styles.line}>Placed: {formatDate(order.createdAt)}</Text>
        <Text style={styles.line}>Updated: {formatDate(order.updatedAt)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Delivery Details</Text>
      <View style={styles.infoCard}>
        <Text style={styles.line}>Address: {order.deliveryAddress || '-'}</Text>
        <Text style={styles.line}>Customer note: {order.note || '-'}</Text>
        <Text style={styles.line}>Delivery agent: {order.deliveryAgentId?.name || 'Not assigned'}</Text>
        <Text style={styles.line}>Assigned at: {formatDate(order.deliveryAssignedAt)}</Text>
        <Text style={styles.line}>Delivered at: {formatDate(order.deliveredAt)}</Text>
        <Text style={styles.line}>Delivery notes: {order.deliveryNotes || '-'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Line Items</Text>
      {(order.items || []).map((line, idx) => (
        <View key={`${line.stockId?._id || line.stockId || idx}`} style={styles.item}>
          <Text style={styles.product}>{line.product}</Text>
          <Text style={styles.meta}>
            {line.quantity} kg x LKR {Number(line.price).toFixed(2)} = LKR {Number(line.quantity * line.price).toFixed(2)}
          </Text>
          <Text style={styles.meta}>
            Farmer: {line.farmerId?.name || 'Unknown'} ({line.farmerId?.email || 'no email'})
          </Text>
          <Text style={styles.meta}>
            Farmer confirmed: {line.farmerConfirmed ? 'yes' : 'no'}
            {line.farmerConfirmedAt ? ` at ${formatDate(line.farmerConfirmedAt)}` : ''}
          </Text>
          <Text style={styles.meta}>
            Stock deducted: {line.stockDeducted ? 'yes' : 'no'} | Stock status: {line.stockId?.status || '-'}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Set Status</Text>
      <View style={styles.statusGrid}>
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, order.status === s && styles.statusBtnActive, busy && styles.disabled]}
            onPress={() => setStatus(s)}
            disabled={busy}
          >
            <Text style={[styles.statusBtnText, order.status === s && styles.statusBtnTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Danger Zone</Text>
      <TouchableOpacity
        style={[styles.deleteBtn, busy && styles.disabled]}
        onPress={handleDelete}
        disabled={busy}
      >
        <Text style={styles.deleteBtnText}>Delete Order</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#e65100', marginBottom: 12 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffe0b2'
  },
  line: { marginTop: 6, fontWeight: '600', color: '#424242' },
  sectionTitle: { marginTop: 20, fontWeight: '900', color: '#757575', fontSize: 12, textTransform: 'uppercase' },
  item: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffe0b2'
  },
  product: { fontWeight: '800', color: '#212121' },
  meta: { marginTop: 4, color: '#616161', fontSize: 13 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffcc80'
  },
  statusBtnActive: { backgroundColor: '#fff3e0', borderColor: '#ff9800' },
  statusBtnText: { fontWeight: '800', color: '#e65100', fontSize: 13 },
  statusBtnTextActive: { color: '#bf360c' },
  disabled: { opacity: 0.5 },
  btn: { marginTop: 16, backgroundColor: '#ff9800', padding: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '800' },
  deleteBtn: {
    marginTop: 12,
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center'
  },
  deleteBtnText: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 15
  }
});

export default AdminOrderDetailScreen;
