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
import { getDeliveryById, cancelDelivery } from '../../services/deliveryService';

const statusColors = {
  pending: '#ca8a04',
  assigned: '#7c3aed',
  'in-transit': '#2563eb',
  delivered: '#15803d',
  cancelled: '#b91c1c'
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

const DeliveryDetailScreen = ({ route, navigation }) => {
  const { deliveryId } = route.params;
  const { token, user, logout } = useContext(AuthContext);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      if (!token || !deliveryId) return;
      const res = await getDeliveryById(deliveryId, token);
      setDelivery(res.data || null);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setDelivery(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [deliveryId, token])
  );

  const handleCancel = () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to cancel this delivery?')) return;
      setBusy(true);
      cancelDelivery(deliveryId, token)
        .then(async () => { await load(); window.alert('Delivery has been cancelled.'); })
        .catch((e) => window.alert('Error: ' + (e.message || 'Could not cancel delivery.')))
        .finally(() => setBusy(false));
      return;
    }

    Alert.alert(
      'Cancel Delivery',
      'Are you sure you want to cancel this delivery?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await cancelDelivery(deliveryId, token);
              await load();
              Alert.alert('Cancelled', 'Delivery has been cancelled.');
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not cancel delivery.');
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Delivery not found.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const orderShortId = delivery.orderId?._id
    ? String(delivery.orderId._id).slice(-8).toUpperCase()
    : '—';
  const agentName = delivery.agentId?.name || 'Not assigned';
  const agentEmail = delivery.agentId?.email || '';
  const customerName = delivery.customerId?.name || 'Unknown';
  const customerEmail = delivery.customerId?.email || '';
  const isAdmin = (user?.role || '').toString().toLowerCase() === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery #{String(delivery._id).slice(-8).toUpperCase()}</Text>
        <Text style={styles.orderRef}>Order #{orderShortId}</Text>
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(delivery.status)}22` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(delivery.status) }]}>
            {delivery.status || 'pending'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.label}>{customerName}</Text>
        <Text style={styles.subLabel}>{customerEmail}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <Text style={styles.value}>{delivery.deliveryAddress || 'Not provided'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assigned Agent</Text>
        <Text style={styles.label}>{agentName}</Text>
        {agentEmail ? <Text style={styles.subLabel}>{agentEmail}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timestamps</Text>
        <Text style={styles.timestamp}>
          Created: {formatDate(delivery.createdAt)}
        </Text>
        {delivery.assignedAt && (
          <Text style={styles.timestamp}>
            Assigned: {formatDate(delivery.assignedAt)}
          </Text>
        )}
        {delivery.pickedUpAt && (
          <Text style={styles.timestamp}>
            Picked Up: {formatDate(delivery.pickedUpAt)}
          </Text>
        )}
        {delivery.deliveredAt && (
          <Text style={styles.timestamp}>
            Delivered: {formatDate(delivery.deliveredAt)}
          </Text>
        )}
      </View>

      {delivery.note ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.value}>{delivery.note}</Text>
        </View>
      ) : null}

      {isAdmin && (delivery.status === 'pending' || delivery.status === 'assigned') && (
        <TouchableOpacity
          style={[styles.cancelBtn, busy && styles.disabled]}
          onPress={handleCancel}
          disabled={busy}
        >
          <Text style={styles.cancelBtnText}>Cancel Delivery</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backBtnText}>Back to Deliveries</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  content: { padding: 18, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#0c4a6e' },
  orderRef: { marginTop: 6, fontSize: 16, color: '#0369a1', fontWeight: '600' },
  statusSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '800', fontSize: 14, textTransform: 'capitalize' },
  label: { fontWeight: '800', color: '#111827' },
  subLabel: { marginTop: 2, color: '#64748b', fontSize: 13 },
  value: { color: '#333', fontSize: 15 },
  timestamp: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  cancelBtn: {
    marginTop: 20,
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  cancelBtnText: { color: '#991b1b', fontWeight: '900' },
  backBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  backBtnText: { color: '#0369a1', fontWeight: '600' },
  disabled: { opacity: 0.6 },
  muted: { color: '#64748b', fontWeight: '600' },
  btn: { marginTop: 16, backgroundColor: '#FF9800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '800' }
});

export default DeliveryDetailScreen;
