import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getPaymentOverview } from '../../services/paymentService';

const statusColors = {
  SUCCESS: '#15803d',
  FAILED: '#b91c1c',
  PENDING: '#ca8a04'
};

const methodIcons = { CASH: '💵', CARD: '💳', BANK_TRANSFER: '🏦' };

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '—'; }
};

const StatBox = ({ label, value, color }) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const AdminPaymentScreen = ({ navigation }) => {
  const { token, logout } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    try {
      if (!token) return;
      const res = await getPaymentOverview(token);
      setPayments(Array.isArray(res.data) ? res.data : []);
      setStats(res.stats || null);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [token]));

  const filtered = filter === 'ALL'
    ? payments
    : payments.filter(p => p.paymentStatus === filter);

  const renderPayment = ({ item }) => {
    const color = statusColors[item.paymentStatus] || '#64748b';
    const icon = methodIcons[item.paymentMethod] || '💰';
    const customerName = item.customerId?.name || 'Unknown';
    const orderId = item.orderId?._id || item.orderId;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PaymentDetail', { paymentId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.methodRow}>
            <Text style={styles.methodIcon}>{icon}</Text>
            <View>
              <Text style={styles.txRef}>{item.transactionReference || 'N/A'}</Text>
              <Text style={styles.orderRef}>
                Order #{orderId ? String(orderId).slice(-8).toUpperCase() : '—'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.statusText, { color }]}>{item.paymentStatus}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.customerLabel}>Customer</Text>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amount}>LKR {Number(item.amount || 0).toFixed(2)}</Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FILTERS = ['ALL', 'SUCCESS', 'FAILED', 'PENDING'];

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  const handleGenerateReport = () => {
    const msg = 'Generating and downloading transaction history report...';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Report Generation', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats Banner */}
      {stats && (
        <View style={styles.statsBanner}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.revenueLabel}>TOTAL REVENUE</Text>
              <Text style={styles.revenueAmount}>
                LKR {Number(stats.totalRevenue || 0).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity style={styles.reportBtn} onPress={handleGenerateReport}>
              <Text style={styles.reportBtnText}>📄 Generate Report</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <StatBox label="Total" value={stats.total || 0} color="#fff" />
            <StatBox label="Success" value={stats.success || 0} color="#86efac" />
            <StatBox label="Failed" value={stats.failed || 0} color="#fca5a5" />
            <StatBox label="Pending" value={stats.pending || 0} color="#fde68a" />
          </View>
        </View>
      )}

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
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
            <Text style={styles.empty}>No payments found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsBanner: {
    backgroundColor: '#e65100',
    padding: 20,
    paddingBottom: 22
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  reportBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  reportBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  revenueLabel: {
    color: '#ffccbc',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  revenueAmount: { color: '#fff', fontSize: 30, fontWeight: '900' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#ffccbc', fontSize: 11, marginTop: 2 },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe0b2'
  },
  filterChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  filterText: { color: '#757575', fontWeight: '700', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffe0b2',
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14
  },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodIcon: { fontSize: 24 },
  txRef: { fontWeight: '800', color: '#0f172a', fontSize: 14 },
  orderRef: { color: '#166534', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#fff3e0' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14
  },
  customerLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  customerName: { fontWeight: '700', color: '#1e293b', marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amount: { fontWeight: '900', color: '#e65100', fontSize: 16 },
  date: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: '#374151', fontWeight: '700', fontSize: 16 }
});

export default AdminPaymentScreen;
