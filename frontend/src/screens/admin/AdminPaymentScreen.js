import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import {
  deletePayment,
  getPaymentOverview,
  updatePaymentStatus
} from '../../services/paymentService';

const statusColors = {
  SUCCESS: '#15803d',
  FAILED: '#b91c1c',
  PENDING: '#ca8a04'
};

const methodLabels = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer'
};

const STATUS_FILTERS = ['ALL', 'SUCCESS', 'PENDING', 'FAILED'];

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
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      if (!token) return;
      const res = await getPaymentOverview(token, { limit: 500 });
      setPayments(Array.isArray(res.data) ? res.data : []);
      setStats(res.stats || null);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [token])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = filter === 'ALL' || payment.paymentStatus === filter;
      if (!matchesStatus) return false;
      if (!q) return true;

      const orderId = payment.orderId?._id || payment.orderId || '';
      const customer = `${payment.customerId?.name || ''} ${payment.customerId?.email || ''}`;
      const haystack = [
        payment.transactionReference,
        payment.paymentMethod,
        payment.paymentStatus,
        orderId,
        customer
      ].join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }, [payments, filter, search]);

  const confirm = (title, message, onConfirm) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm }
    ]);
  };

  const changeStatus = (payment, nextStatus) => {
    confirm('Update payment', `Set this payment to ${nextStatus}?`, async () => {
      setBusyId(payment._id);
      try {
        const note = nextStatus === 'FAILED' ? 'Marked failed/refunded by admin' : payment.note || '';
        await updatePaymentStatus(payment._id, nextStatus, note, token);
        await load();
      } catch (e) {
        const msg = e.message || 'Failed to update payment';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      } finally {
        setBusyId(null);
      }
    });
  };

  const removePayment = (payment) => {
    confirm(
      'Delete payment',
      'Delete this payment record permanently? This cannot be undone.',
      async () => {
        setBusyId(payment._id);
        try {
          await deletePayment(payment._id, token);
          await load();
        } catch (e) {
          const msg = e.message || 'Failed to delete payment';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Error', msg);
        } finally {
          setBusyId(null);
        }
      }
    );
  };

  const handleGenerateReport = () => {
    const rows = [
      ['Payment ID', 'Transaction', 'Order ID', 'Customer', 'Email', 'Method', 'Status', 'Amount', 'Created At'],
      ...filtered.map((payment) => [
        payment._id,
        payment.transactionReference || '',
        payment.orderId?._id || payment.orderId || '',
        payment.customerId?.name || '',
        payment.customerId?.email || '',
        payment.paymentMethod || '',
        payment.paymentStatus || '',
        Number(payment.amount || 0).toFixed(2),
        formatDate(payment.createdAt)
      ])
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-report-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    Alert.alert('Report ready', 'CSV report generation is available on web.');
  };

  const renderPayment = ({ item }) => {
    const color = statusColors[item.paymentStatus] || '#64748b';
    const orderId = item.orderId?._id || item.orderId;
    const customerName = item.customerId?.name || item.orderId?.customerName || 'Unknown customer';
    const isBusy = busyId === item._id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PaymentDetail', { paymentId: item._id })}
        activeOpacity={0.85}
        disabled={isBusy}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.txRef}>{item.transactionReference || `PAY-${String(item._id).slice(-6).toUpperCase()}`}</Text>
            <Text style={styles.orderRef}>
              Order #{orderId ? String(orderId).slice(-8).toUpperCase() : '-'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.statusText, { color }]}>{item.paymentStatus}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <Text style={styles.customerName}>{customerName}</Text>
          <Text style={styles.customerEmail}>{item.customerId?.email || 'No customer email'}</Text>
          <Text style={styles.meta}>Method: {methodLabels[item.paymentMethod] || item.paymentMethod || '-'}</Text>
          <Text style={styles.meta}>Order status: {item.orderId?.status || '-'}</Text>
          <Text style={styles.amount}>LKR {Number(item.amount || 0).toFixed(2)}</Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>

        {isBusy ? (
          <ActivityIndicator size="small" color="#166534" style={styles.actionLoader} />
        ) : (
          <View style={styles.actions}>
            {item.paymentStatus !== 'SUCCESS' && (
              <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={() => changeStatus(item, 'SUCCESS')}>
                <Text style={styles.successText}>Mark Paid</Text>
              </TouchableOpacity>
            )}
            {item.paymentStatus !== 'PENDING' && (
              <TouchableOpacity style={[styles.actionBtn, styles.pendingBtn]} onPress={() => changeStatus(item, 'PENDING')}>
                <Text style={styles.pendingText}>Pending</Text>
              </TouchableOpacity>
            )}
            {item.paymentStatus !== 'FAILED' && (
              <TouchableOpacity style={[styles.actionBtn, styles.failBtn]} onPress={() => changeStatus(item, 'FAILED')}>
                <Text style={styles.failText}>Fail/Refund</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => removePayment(item)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {stats && (
        <View style={styles.statsBanner}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
              <Text style={styles.revenueAmount}>
                LKR {Number(stats.totalRevenue || 0).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity style={styles.reportBtn} onPress={handleGenerateReport}>
              <Text style={styles.reportBtnText}>Generate Report</Text>
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

      <TextInput
        style={styles.search}
        placeholder="Search transaction, customer, email, order..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterBar}>
        {STATUS_FILTERS.map((f) => (
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>No payments found</Text>
            <Text style={styles.emptyHint}>Payments will appear here after customers complete checkout.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsBanner: { backgroundColor: '#e65100', padding: 20, paddingBottom: 22 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  reportBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  reportBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  revenueLabel: { color: '#ffccbc', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  revenueAmount: { color: '#fff', fontSize: 30, fontWeight: '900' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#ffccbc', fontSize: 11, marginTop: 2 },
  search: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffe0b2',
    fontSize: 15,
    color: '#111827'
  },
  filterBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffe0b2' },
  filterChipActive: { backgroundColor: '#166534', borderColor: '#166534' },
  filterText: { color: '#757575', fontWeight: '700', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 14, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ffe0b2', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 12 },
  txRef: { fontWeight: '900', color: '#0f172a', fontSize: 14 },
  orderRef: { color: '#166534', fontSize: 12, marginTop: 2, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#fff3e0' },
  cardBody: { padding: 14 },
  customerName: { fontWeight: '800', color: '#1e293b' },
  customerEmail: { color: '#64748b', marginTop: 2, fontSize: 12 },
  meta: { color: '#64748b', marginTop: 4, fontSize: 12, fontWeight: '600' },
  amount: { marginTop: 8, fontWeight: '900', color: '#e65100', fontSize: 17 },
  date: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  successBtn: { backgroundColor: '#dcfce7' },
  successText: { color: '#166534', fontWeight: '800', fontSize: 12 },
  pendingBtn: { backgroundColor: '#fef3c7' },
  pendingText: { color: '#92400e', fontWeight: '800', fontSize: 12 },
  failBtn: { backgroundColor: '#fee2e2' },
  failText: { color: '#991b1b', fontWeight: '800', fontSize: 12 },
  deleteBtn: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  deleteText: { color: '#dc2626', fontWeight: '900', fontSize: 12 },
  actionLoader: { marginVertical: 12 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  empty: { color: '#374151', fontWeight: '800', fontSize: 16 },
  emptyHint: { color: '#64748b', marginTop: 6, textAlign: 'center' }
});

export default AdminPaymentScreen;
