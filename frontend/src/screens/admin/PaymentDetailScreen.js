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
import { deletePayment, getPaymentById, updatePaymentStatus } from '../../services/paymentService';

const STATUSES = ['PENDING', 'SUCCESS', 'FAILED'];

const statusColors = {
  SUCCESS: '#15803d',
  FAILED: '#b91c1c',
  PENDING: '#ca8a04'
};

const formatDate = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleString('en-GB', {
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

const PaymentDetailScreen = ({ route, navigation }) => {
  const { paymentId } = route.params || {};
  const { token, user, logout } = useContext(AuthContext);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      if (!token || !paymentId) return;
      const res = await getPaymentById(paymentId, token);
      setPayment(res.data || null);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setPayment(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [paymentId, token])
  );

  const setStatus = (nextStatus) => {
    const message = nextStatus === 'FAILED'
      ? 'Mark this payment as failed/refunded?'
      : `Set payment status to ${nextStatus}?`;

    const run = async () => {
      setBusy(true);
      try {
        const note = nextStatus === 'FAILED' ? 'Refunded or failed by admin' : payment?.note || '';
        await updatePaymentStatus(paymentId, nextStatus, note, token);
        await load();
      } catch (e) {
        const errorMessage = e.message || 'Payment update failed';
        if (Platform.OS === 'web') window.alert(errorMessage);
        else Alert.alert('Error', errorMessage);
      } finally {
        setBusy(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }

    Alert.alert('Update payment', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: run }
    ]);
  };

  const handleDelete = () => {
    const message = 'Delete this payment record permanently? This cannot be undone.';

    const run = async () => {
      setBusy(true);
      try {
        await deletePayment(paymentId, token);
        if (Platform.OS === 'web') {
          window.alert('Payment deleted.');
          navigation.goBack();
        } else {
          Alert.alert('Success', 'Payment deleted.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      } catch (e) {
        const errorMessage = e.message || 'Delete failed';
        if (Platform.OS === 'web') window.alert(errorMessage);
        else Alert.alert('Error', errorMessage);
      } finally {
        setBusy(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) run();
      return;
    }

    Alert.alert('Delete payment', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Payment not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const orderId = payment.orderId?._id || payment.orderId;
  const color = statusColors[payment.paymentStatus] || '#64748b';
  const isAdmin = (user?.role || '').toString().toLowerCase() === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Payment #{String(payment._id).slice(-8).toUpperCase()}</Text>
      <View style={styles.section}>
        <Text style={styles.line}>Transaction: {payment.transactionReference || '-'}</Text>
        <Text style={styles.line}>Order: #{orderId ? String(orderId).slice(-8).toUpperCase() : '-'}</Text>
        <Text style={styles.line}>Order status: {payment.orderId?.status || '-'}</Text>
        <Text style={styles.line}>Customer: {payment.customerId?.name || 'Unknown'}</Text>
        <Text style={styles.line}>Email: {payment.customerId?.email || '-'}</Text>
        <Text style={styles.line}>Method: {payment.paymentMethod}</Text>
        <Text style={styles.line}>Amount: LKR {Number(payment.amount || 0).toFixed(2)}</Text>
        <Text style={styles.line}>Created: {formatDate(payment.createdAt)}</Text>
        <Text style={styles.line}>Updated: {formatDate(payment.updatedAt)}</Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.statusText, { color }]}>{payment.paymentStatus}</Text>
      </View>

      {!!payment.note && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note</Text>
          <Text style={styles.note}>{payment.note}</Text>
        </View>
      )}

      {isAdmin && (
        <>
          <Text style={styles.sectionTitle}>Update status</Text>
          <View style={styles.statusGrid}>
            {STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  payment.paymentStatus === status && styles.statusButtonActive,
                  busy && styles.disabled
                ]}
                onPress={() => setStatus(status)}
                disabled={busy || payment.paymentStatus === status}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    payment.paymentStatus === status && styles.statusButtonTextActive
                  ]}
                >
                  {status === 'FAILED' ? 'Refund / Fail' : status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.deleteButton, busy && styles.disabled]}
            onPress={handleDelete}
            disabled={busy}
          >
            <Text style={styles.deleteButtonText}>Delete Payment</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  content: { padding: 18, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff8f0' },
  title: { fontSize: 22, fontWeight: '900', color: '#e65100', marginBottom: 10 },
  line: { marginTop: 8, color: '#424242', fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', marginTop: 16, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18 },
  statusText: { fontWeight: '900', fontSize: 13 },
  section: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffe0b2'
  },
  sectionTitle: { marginTop: 22, marginBottom: 10, color: '#757575', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  note: { color: '#424242', fontWeight: '600' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffcc80'
  },
  statusButtonActive: { backgroundColor: '#fff3e0', borderColor: '#ff9800' },
  statusButtonText: { color: '#e65100', fontWeight: '800', fontSize: 13 },
  statusButtonTextActive: { color: '#bf360c' },
  disabled: { opacity: 0.55 },
  deleteButton: {
    marginTop: 18,
    backgroundColor: '#fee2e2',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '900'
  },
  muted: { color: '#64748b', fontWeight: '700' },
  backButton: { marginTop: 16, backgroundColor: '#ff9800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#fff', fontWeight: '900' }
});

export default PaymentDetailScreen;
