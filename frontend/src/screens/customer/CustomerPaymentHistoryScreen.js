import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getMyPayments } from '../../services/paymentService';

const statusColors = {
  SUCCESS: '#15803d',
  FAILED: '#b91c1c',
  PENDING: '#ca8a04'
};

const methodIcons = {
  CASH: '💵',
  CARD: '💳',
  BANK_TRANSFER: '🏦'
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
};

const CustomerPaymentHistoryScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      if (!token) return;
      const res = await getMyPayments(token);
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [token]));

  const totalPaid = payments
    .filter(p => p.paymentStatus === 'SUCCESS')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const renderPayment = ({ item }) => {
    const color = statusColors[item.paymentStatus] || '#64748b';
    const icon = methodIcons[item.paymentMethod] || '💰';
    const orderId = item.orderId?._id || item.orderId;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PaymentDetail', { paymentId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardRow}>
          <View style={styles.methodIconBox}>
            <Text style={styles.methodIcon}>{icon}</Text>
          </View>
          <View style={styles.cardMid}>
            <Text style={styles.txRef}>{item.transactionReference || 'N/A'}</Text>
            <Text style={styles.orderRef}>
              Order #{orderId ? String(orderId).slice(-8).toUpperCase() : '—'}
            </Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.amount}>LKR {Number(item.amount || 0).toFixed(2)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${color}22` }]}>
              <Text style={[styles.statusText, { color }]}>{item.paymentStatus}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Summary Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>TOTAL PAID</Text>
        <Text style={styles.bannerAmount}>LKR {totalPaid.toFixed(2)}</Text>
        <Text style={styles.bannerCount}>{payments.length} transaction{payments.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item._id}
        renderItem={renderPayment}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.empty}>No payments yet</Text>
            <Text style={styles.emptyHint}>Your payment history will appear here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    backgroundColor: '#1d4ed8',
    padding: 20,
    alignItems: 'center',
    paddingBottom: 24
  },
  bannerLabel: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  bannerAmount: { color: '#fff', fontSize: 32, fontWeight: '900' },
  bannerCount: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  methodIcon: { fontSize: 22 },
  cardMid: { flex: 1 },
  txRef: { fontWeight: '800', color: '#0f172a', fontSize: 14 },
  orderRef: { color: '#0369a1', fontSize: 13, marginTop: 2 },
  date: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  amount: { fontWeight: '900', color: '#0f172a', fontSize: 15 },
  statusBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '800' },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: '#374151', fontWeight: '700', fontSize: 16 },
  emptyHint: { color: '#94a3b8', marginTop: 8, textAlign: 'center' }
});

export default CustomerPaymentHistoryScreen;
