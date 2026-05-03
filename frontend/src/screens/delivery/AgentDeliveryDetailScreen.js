import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getDeliveryById, updateDeliveryStatus, assignDriverToDelivery } from '../../services/deliveryService';

const statusColors = {
  pending: '#ca8a04',
  assigned: '#047857',
  'in-transit': '#15803d',
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

const AgentDeliveryDetailScreen = ({ route, navigation }) => {
  const { deliveryId } = route.params;
  const { token, logout } = useContext(AuthContext);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Third-party driver states
  const [driverName, setDriverName] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [driverVehicle, setDriverVehicle] = useState('');

  const load = async () => {
    try {
      if (!token || !deliveryId) return;
      const res = await getDeliveryById(deliveryId, token);
      const data = res.data || null;
      setDelivery(data);
      if (data) {
        setDriverName(data.driverName || '');
        setDriverContact(data.driverContact || '');
        setDriverVehicle(data.driverVehicle || '');
      }
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

  const handleStatusUpdate = (newStatus) => {
    const statusLabels = {
      'in-transit': 'Start Delivery',
      delivered: 'Mark as Delivered'
    };
    const label = statusLabels[newStatus];
    const msg = `Do you want to ${label.toLowerCase()}?`;

    if (Platform.OS === 'web') {
      if (!window.confirm(msg)) return;
      setBusy(true);
      updateDeliveryStatus(deliveryId, newStatus, token)
        .then(async () => {
          await load();
          window.alert(`Delivery marked as ${newStatus === 'in-transit' ? 'In Transit' : 'Delivered'}`);
        })
        .catch((e) => window.alert('Error: ' + (e.message || 'Failed to update status')))
        .finally(() => setBusy(false));
      return;
    }

    Alert.alert(
      label,
      msg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBusy(true);
            try {
              await updateDeliveryStatus(deliveryId, newStatus, token);
              await load();
              Alert.alert('Success', `Delivery marked as ${newStatus === 'in-transit' ? 'In Transit' : 'Delivered'}`);
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to update status');
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  };

  const handleAssignDriver = async () => {
    if (!driverName.trim() || !driverContact.trim() || !driverVehicle.trim()) {
      const msg = 'Please fill out all driver details.';
      if (Platform.OS === 'web') { window.alert(msg); } else { Alert.alert('Validation Error', msg); }
      return;
    }
    setBusy(true);
    try {
      await assignDriverToDelivery(
        deliveryId, 
        { driverName: driverName.trim(), driverContact: driverContact.trim(), driverVehicle: driverVehicle.trim() },
        token
      );
      await load();
      const successMsg = 'Driver assigned successfully.';
      if (Platform.OS === 'web') { window.alert(successMsg); } else { Alert.alert('Success', successMsg); }
    } catch (error) {
      const errMsg = error.message || 'Failed to assign driver';
      if (Platform.OS === 'web') { window.alert('Error: ' + errMsg); } else { Alert.alert('Error', errMsg); }
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
  const customerName = delivery.customerId?.name || 'Unknown';
  const totalAmount = delivery.orderId?.totalAmount || 0;

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
            {delivery.status === 'in-transit' ? 'In Transit' : delivery.status || 'pending'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.label}>{customerName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <Text style={styles.value}>{delivery.deliveryAddress || 'Not provided'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        <Text style={styles.amount}>LKR {Number(totalAmount).toFixed(2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <Text style={styles.timestamp}>Created: {formatDate(delivery.createdAt)}</Text>
        {delivery.assignedAt && <Text style={styles.timestamp}>Assigned: {formatDate(delivery.assignedAt)}</Text>}
        {delivery.pickedUpAt && <Text style={styles.timestamp}>Picked Up: {formatDate(delivery.pickedUpAt)}</Text>}
        {delivery.deliveredAt && <Text style={styles.timestamp}>Delivered: {formatDate(delivery.deliveredAt)}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Third-Party Driver</Text>
        {delivery.status === 'assigned' && !delivery.driverName ? (
          <View>
            <Text style={styles.driverHint}>Assign a third-party driver to proceed.</Text>
            <TextInput
              style={styles.input}
              placeholder="Driver Name"
              value={driverName}
              onChangeText={setDriverName}
            />
            <TextInput
              style={styles.input}
              placeholder="Contact Number"
              keyboardType="phone-pad"
              value={driverContact}
              onChangeText={setDriverContact}
            />
            <TextInput
              style={styles.input}
              placeholder="Vehicle Details (e.g. Van, ABC-1234)"
              value={driverVehicle}
              onChangeText={setDriverVehicle}
            />
            <TouchableOpacity 
              style={[styles.driverBtn, busy && styles.disabled]} 
              onPress={handleAssignDriver}
              disabled={busy}
            >
              <Text style={styles.driverBtnText}>Save Driver Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {delivery.driverName ? (
              <>
                <Text style={styles.driverVal}><Text style={styles.driverLbl}>Name:</Text> {delivery.driverName}</Text>
                <Text style={styles.driverVal}><Text style={styles.driverLbl}>Contact:</Text> {delivery.driverContact}</Text>
                <Text style={styles.driverVal}><Text style={styles.driverLbl}>Vehicle:</Text> {delivery.driverVehicle}</Text>
              </>
            ) : (
              <Text style={styles.muted}>No driver assigned.</Text>
            )}
          </View>
        )}
      </View>

      {delivery.status === 'assigned' && delivery.driverName && (
        <TouchableOpacity
          style={[styles.actionBtn, busy && styles.disabled]}
          onPress={() => handleStatusUpdate('in-transit')}
          disabled={busy}
        >
          <Text style={styles.actionBtnText}>Start Delivery</Text>
        </TouchableOpacity>
      )}

      {delivery.status === 'in-transit' && (
        <TouchableOpacity
          style={[styles.completeBtn, busy && styles.disabled]}
          onPress={() => handleStatusUpdate('delivered')}
          disabled={busy}
        >
          <Text style={styles.completeBtnText}>Mark as Delivered</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backBtnText}>Back to My Deliveries</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 18, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#14532d' },
  orderRef: { marginTop: 6, fontSize: 16, color: '#166534', fontWeight: '600' },
  statusSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '800', fontSize: 14, textTransform: 'capitalize' },
  label: { fontWeight: '800', color: '#111827' },
  value: { color: '#333', fontSize: 15 },
  amount: { fontSize: 18, fontWeight: '900', color: '#166534' },
  timestamp: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  actionBtn: {
    marginTop: 20,
    backgroundColor: '#e8f5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  actionBtnText: { color: '#2e7d32', fontWeight: '900', fontSize: 16 },
  completeBtn: {
    marginTop: 20,
    backgroundColor: '#d1fae5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  completeBtnText: { color: '#059669', fontWeight: '900', fontSize: 16 },
  backBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  backBtnText: { color: '#166534', fontWeight: '600' },
  disabled: { opacity: 0.6 },
  muted: { color: '#64748b', fontWeight: '600' },
  btn: { marginTop: 16, backgroundColor: '#15803d', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    color: '#0f172a'
  },
  driverHint: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  driverBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4
  },
  driverBtnText: { color: '#fff', fontWeight: '700' },
  driverLbl: { fontWeight: '700', color: '#475569' },
  driverVal: { color: '#0f172a', marginBottom: 4 }
});

export default AgentDeliveryDetailScreen;
