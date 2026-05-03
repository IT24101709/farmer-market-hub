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
import { getOrderById, updateOrderStatus } from '../../services/orderService';

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED'];

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
            await updateOrderStatus(orderId, status.toLowerCase(), null, token);
            await load();
            if (status === 'CONFIRMED') {
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
      <Text style={styles.line}>Customer: {order.customerName}</Text>
      <Text style={styles.line}>Current status: {order.status}</Text>
      <Text style={styles.line}>Total: LKR {Number(order.totalAmount || 0).toFixed(2)}</Text>

      <Text style={styles.sectionTitle}>Line items</Text>
      {(order.items || []).map((line, idx) => (
        <View key={`${line.stockId}-${idx}`} style={styles.item}>
          <Text style={styles.product}>{line.product}</Text>
          <Text style={styles.meta}>
            {line.quantity} kg × LKR {Number(line.price).toFixed(2)} · Farmer confirmed:{' '}
            {line.farmerConfirmed ? 'yes' : 'no'}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Set status (admin)</Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#e65100' },
  line: { marginTop: 8, fontWeight: '600', color: '#424242' },
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
  btnText: { color: '#fff', fontWeight: '800' }
});

export default AdminOrderDetailScreen;
