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
import { confirmFarmerOrder, getFarmerOrderPublic } from '../../services/farmerService';
import getEnvVars from '../../config';
import axios from 'axios';

const { apiUrl } = getEnvVars();

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

const OrderDetailsScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { token, user } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const farmerId = user?.id || user?._id;

const load = async () => {
    try {
      if (!token || !orderId) return;
      const data = await getFarmerOrderPublic(orderId, token);
      setOrder(data);
    } catch (e) {
      console.error(e);
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

  const myItems = order?.items?.filter((i) => String(i.farmerId) === String(farmerId)) || [];
  const mySubtotal = myItems.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const myLinesFullyConfirmed =
    myItems.length > 0 && myItems.every((l) => Boolean(l.farmerConfirmed));

  const updateStatus = async (nextStatus) => {
    if (!token || !order?._id) return;
    setUpdating(true);
    try {
      await axios.put(
        `${apiUrl}/orders/${order._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await load();
      showMessage('Updated', `Order status set to ${nextStatus}.`);
    } catch (err) {
      showMessage('Error', err.response?.data?.message || err.message || 'Could not update order.');
    } finally {
      setUpdating(false);
    }
  };

  const showMessage = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(message || title);
      return;
    }
    Alert.alert(title, message);
  };

  const confirmPress = () => {
    const run = async () => {
      setUpdating(true);
      try {
        const res = await confirmFarmerOrder(orderId, token);
        await load();
        showMessage('Done', res.message || 'Your items are confirmed and stock has been reserved.');
      } catch (err) {
        showMessage('Cannot confirm', err.message || 'Stock may have changed. Try again.');
      } finally {
        setUpdating(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Confirm and reserve quantity for your items on this order?')) {
        run();
      }
      return;
    }

    Alert.alert(
      'Confirm your produce',
      'We will check stock again and reserve quantity for your items on this order.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: run
        }
      ]
    );
  };

  const readyForDeliveryPress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Mark this order as ready for delivery module?')) {
        updateStatus('READY_FOR_DELIVERY');
      }
      return;
    }

    Alert.alert('Ready for delivery', 'Mark this order as ready for delivery module?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateStatus('READY_FOR_DELIVERY') }
    ]);
  };

  const deliveredPress = () => {
    Alert.alert('Mark delivered', 'Confirm delivery to the customer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delivered', onPress: () => updateStatus('DELIVERED') }
    ]);
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
        <Text style={styles.missing}>Order not found or you do not have access.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const trackingSteps = [
    { key: 'PENDING', label: 'Order placed' },
    { key: 'CONFIRMED', label: 'Confirmed by farmer' },
    { key: 'READY_FOR_DELIVERY', label: 'Ready for delivery' },
    { key: 'ASSIGNED', label: 'Agent assigned' },
    { key: 'IN_TRANSIT', label: 'In transit' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];
const statusOrder = ['PENDING', 'CONFIRMED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'];
  const displayStatus = order.status || order.legacyStatus || 'PENDING';
  let trackingStatusKey = typeof displayStatus === 'string' ? displayStatus : 'PENDING';
  if (!statusOrder.includes(trackingStatusKey)) {
    if (displayStatus === 'Processing' || order.legacyStatus === 'Processing') {
      trackingStatusKey = 'CONFIRMED';
    } else if (displayStatus === 'Pending' || displayStatus === 'PENDING') {
      trackingStatusKey = 'PENDING';
    } else {
      trackingStatusKey = 'PENDING';
    }
  }
  if (trackingStatusKey === 'PENDING' && myLinesFullyConfirmed) {
    trackingStatusKey = 'CONFIRMED';
  }
  const currentIdx = statusOrder.indexOf(trackingStatusKey);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'Cancelled';
  const isFailed = order.status === 'FAILED_DELIVERY';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Order details</Text>
      <Text style={styles.orderId}>Ref: …{String(order._id).slice(-8).toUpperCase()}</Text>

<View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.statusBig}>
          {(displayStatus === 'CONFIRMED' || displayStatus === 'Processing') ? 'Confirmed by farmer' :
           (displayStatus === 'PENDING' || displayStatus === 'Pending') && myLinesFullyConfirmed ? 'Confirmed by farmer' :
           displayStatus === 'READY_FOR_DELIVERY' ? 'Ready for delivery' :
           displayStatus === 'ASSIGNED' ? 'Agent assigned' :
           displayStatus === 'IN_TRANSIT' || displayStatus === 'Shipped' ? 'In transit' :
           displayStatus === 'DELIVERED' || displayStatus === 'Delivered' ? 'Delivered' :
           displayStatus === 'CANCELLED' || displayStatus === 'Cancelled' ? 'Cancelled' :
           displayStatus === 'PENDING' || displayStatus === 'Pending' ? 'Order placed' : order.status}
        </Text>
        {(displayStatus === 'PENDING' || displayStatus === 'Pending') && myLinesFullyConfirmed && (
          <Text style={styles.metaMuted}>
            Your produce is confirmed. If other farms supply this order, the overall status may stay active until everyone
            confirms.
          </Text>
        )}
        <Text style={styles.meta}>Placed: {formatDate(order.createdAt)}</Text>
        {order.updatedAt && order.updatedAt !== order.createdAt && (
          <Text style={styles.meta}>Last update: {formatDate(order.updatedAt)}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tracking</Text>
        {isCancelled ? (
          <Text style={styles.cancelledText}>This order was cancelled.</Text>
        ) : isFailed ? (
          <Text style={styles.failedText}>Delivery failed. Please contact support.</Text>
        ) : (
          trackingSteps.map((step) => {
            const stepIdx = statusOrder.indexOf(step.key);
            const idx = currentIdx >= 0 ? currentIdx : 0;
            const done = idx >= stepIdx && stepIdx >= 0;
            const current = trackingStatusKey === step.key;
            return (
              <View key={step.key} style={styles.trackRow}>
                <View style={[styles.trackDot, done && styles.trackDotDone, current && styles.trackDotCurrent]} />
                <Text style={[styles.trackLabel, done && styles.trackLabelDone]}>{step.label}</Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.customer}>{order.customerName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your items in this order</Text>
        {myItems.length === 0 ? (
          <Text style={styles.muted}>No line items linked to your farm on this order.</Text>
        ) : (
          myItems.map((line, idx) => (
            <View key={`${line.stockId}-${idx}`} style={styles.lineRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.product}>{line.product}</Text>
                <Text style={styles.lineMeta}>
                  {line.quantity} kg × LKR {Number(line.price).toFixed(2)}
                  {line.farmerConfirmed ? ' · Confirmed' : ' · Awaiting your confirm'}
                </Text>
              </View>
              <Text style={styles.lineTotal}>
                LKR {(Number(line.price) * Number(line.quantity)).toFixed(2)}
              </Text>
            </View>
          ))
        )}
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Your subtotal</Text>
          <Text style={styles.subtotalValue}>LKR {mySubtotal.toFixed(2)}</Text>
        </View>
        <Text style={styles.orderGrand}>Full order total: LKR {Number(order.totalAmount || 0).toFixed(2)}</Text>
      </View>

<View style={styles.actions}>
        {(order.status === 'PENDING' || order.status === 'Pending') && myItems.some((l) => !l.farmerConfirmed) && (
          <TouchableOpacity
            style={[styles.primaryBtn, updating && styles.btnDisabled]}
            onPress={confirmPress}
            disabled={updating}
          >
            <Text style={styles.primaryBtnText}>Confirm my stock</Text>
          </TouchableOpacity>
        )}
        {(order.status === 'CONFIRMED' || order.status === 'Processing') && (
          <TouchableOpacity
            style={[styles.primaryBtn, updating && styles.btnDisabled]}
            onPress={readyForDeliveryPress}
            disabled={updating}
          >
            <Text style={styles.primaryBtnText}>Mark as ready for delivery</Text>
          </TouchableOpacity>
        )}
        {order.status === 'READY_FOR_DELIVERY' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Waiting for delivery agent assignment...</Text>
          </View>
        )}
        {(order.status === 'IN_TRANSIT' || order.status === 'Shipped') && (
          <TouchableOpacity
            style={[styles.primaryBtn, updating && styles.btnDisabled]}
            onPress={deliveredPress}
            disabled={updating}
          >
            <Text style={styles.primaryBtnText}>Mark as delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 18, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f0fdf4' },
  missing: { textAlign: 'center', color: '#64748b', fontWeight: '600' },
  backBtn: { marginTop: 16, backgroundColor: '#15803d', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900', color: '#14532d' },
  orderId: { marginTop: 6, color: '#64748b', fontWeight: '700' },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  statusBig: { fontSize: 22, fontWeight: '900', color: '#15803d' },
  meta: { marginTop: 6, color: '#475569', fontWeight: '600' },
  metaMuted: { marginTop: 8, color: '#64748b', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  trackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    marginRight: 12
  },
  trackDotDone: { backgroundColor: '#86efac' },
  trackDotCurrent: { backgroundColor: '#15803d', borderWidth: 2, borderColor: '#bbf7d0' },
  trackLabel: { color: '#94a3b8', fontWeight: '600' },
  trackLabelDone: { color: '#1e293b', fontWeight: '700' },
  customer: { fontSize: 18, fontWeight: '800', color: '#111827' },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  product: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  lineMeta: { marginTop: 4, color: '#64748b', fontWeight: '600', fontSize: 13 },
  lineTotal: { fontWeight: '900', color: '#15803d' },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#dcfce7'
  },
  subtotalLabel: { fontWeight: '800', color: '#374151' },
  subtotalValue: { fontWeight: '900', fontSize: 18, color: '#15803d' },
  orderGrand: { marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: '600' },
  muted: { color: '#94a3b8', fontStyle: 'italic' },
  cancelledText: { color: '#b91c1c', fontWeight: '800', fontSize: 16 },
  failedText: { color: '#b91c1c', fontWeight: '800', fontSize: 16 },
  infoBox: {
    backgroundColor: '#bbf7d0',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },
  infoText: { color: '#1e40af', fontWeight: '700', fontSize: 14 },
  actions: { marginTop: 20 },
  primaryBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});

export default OrderDetailsScreen;
