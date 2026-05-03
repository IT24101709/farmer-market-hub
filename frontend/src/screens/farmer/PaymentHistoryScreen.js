import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import getEnvVars from '../../config';

const { apiUrl } = getEnvVars();

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return '—'; }
};

const StatCard = ({ label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PaymentHistoryScreen = () => {
  const { token, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Farmer earnings = their orders that are COMPLETED / DELIVERED
  const load = async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${apiUrl}/orders/farmer/all`, {
        headers: authHeaders(token)
      });
      const all = Array.isArray(res.data?.data) ? res.data.data
        : Array.isArray(res.data) ? res.data : [];
      const completed = all.filter(o => {
        const s = String(o.status || '').toUpperCase();
        return s === 'DELIVERED' || s === 'COMPLETED';
      });
      setOrders(completed);
    } catch (e) {
      console.error(e);
      if (e?.response?.status === 401) logout();
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [token]));

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const thisMonth = orders.filter(o => {
    const d = new Date(o.createdAt || o.orderDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const renderOrder = ({ item }) => {
    const shortId = item._id ? String(item._id).slice(-8).toUpperCase() : '—';
    const itemCount = Array.isArray(item.items) ? item.items.length : 0;
    const customerName = item.customerId?.name || item.customerName || 'Customer';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{shortId}</Text>
          <View style={styles.paidBadge}>
            <Text style={styles.paidText}>✓ PAID</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.itemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
            <Text style={styles.date}>{formatDate(item.createdAt || item.orderDate)}</Text>
          </View>
          <Text style={styles.amount}>LKR {Number(item.totalAmount || 0).toFixed(2)}</Text>
        </View>

        {/* Items summary */}
        {Array.isArray(item.items) && item.items.length > 0 && (
          <View style={styles.itemsBox}>
            {item.items.slice(0, 3).map((i, idx) => (
              <Text key={idx} style={styles.itemLine}>
                • {i.product || i.name || 'Item'} × {i.quantity}kg
              </Text>
            ))}
            {item.items.length > 3 && (
              <Text style={styles.itemLine}>+ {item.items.length - 3} more...</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Revenue Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>TOTAL EARNINGS</Text>
        <Text style={styles.bannerTotal}>LKR {totalRevenue.toFixed(2)}</Text>
        <View style={styles.statRow}>
          <StatCard label="This Month" value={`LKR ${thisMonth.toFixed(0)}`} color="#86efac" />
          <StatCard label="Orders" value={orders.length} color="#fde68a" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Completed Orders</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.empty}>No completed orders yet</Text>
            <Text style={styles.emptyHint}>
              Earnings will appear here once orders are delivered.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: {
    backgroundColor: '#166534',
    padding: 20,
    paddingBottom: 24
  },
  bannerLabel: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  bannerTotal: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 16 },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4
  },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#bbf7d0', fontSize: 12, marginTop: 2 },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  list: { paddingHorizontal: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  orderId: { fontWeight: '900', color: '#166534', fontSize: 16 },
  paidBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  paidText: { color: '#15803d', fontWeight: '800', fontSize: 12 },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  customerName: { fontWeight: '700', color: '#1e293b', fontSize: 14 },
  itemCount: { color: '#64748b', fontSize: 13, marginTop: 2 },
  date: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: '900', color: '#16a34a' },
  itemsBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8
  },
  itemLine: { color: '#166534', fontSize: 13, marginBottom: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  empty: { color: '#374151', fontWeight: '700', fontSize: 16 },
  emptyHint: { color: '#94a3b8', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 }
});

export default PaymentHistoryScreen;
