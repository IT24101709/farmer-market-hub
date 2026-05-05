import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getAllUsers } from '../../services/adminService';
import {
  exportReportData,
  getActivityReport,
  getMonthlySalesReport,
  setUserActiveStatus
} from '../../services/reportService';

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const money = (value) => `LKR ${Number(value || 0).toFixed(2)}`;

const MetricTile = ({ label, value, tone = 'default' }) => (
  <View style={[styles.metricTile, styles[`metric_${tone}`]]}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const RankedRow = ({ rank, title, meta, value }) => (
  <View style={styles.rankRow}>
    <Text style={styles.rankNo}>{rank}</Text>
    <View style={styles.rankMain}>
      <Text style={styles.rankTitle}>{title}</Text>
      {!!meta && <Text style={styles.rankMeta}>{meta}</Text>}
    </View>
    <Text style={styles.rankValue}>{value}</Text>
  </View>
);

const AdminReportsScreen = () => {
  const { token, logout } = useContext(AuthContext);
  const [month, setMonth] = useState(currentMonth());
  const [sales, setSales] = useState(null);
  const [activity, setActivity] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  const load = async () => {
    try {
      if (!token) return;
      const [salesRes, activityRes, usersRes] = await Promise.all([
        getMonthlySalesReport(token, month),
        getActivityReport(token, month),
        getAllUsers(token)
      ]);
      setSales(salesRes.data || null);
      setActivity(activityRes.data || null);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (e) {
      console.error(e);
      if (e?.status === 401) logout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [token, month])
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.name, user.email, user.role, user.status].join(' ').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const roleSummary = activity?.usersByRole || [];
  const statusSummary = activity?.usersByStatus || [];

  const showMessage = (title, message) => {
    if (Platform.OS === 'web') window.alert(message || title);
    else Alert.alert(title, message);
  };

  const toggleActive = async (item) => {
    const nextActive = item.status !== 'Active';
    setBusyUserId(item._id);
    try {
      await setUserActiveStatus(item._id, nextActive, token);
      await load();
      showMessage('Updated', `${item.name} is now ${nextActive ? 'Active' : 'Suspended'}.`);
    } catch (e) {
      showMessage('Error', e.message || 'Could not update user.');
    } finally {
      setBusyUserId(null);
    }
  };

  const exportReport = async (type, format) => {
    try {
      const data = await exportReportData(token, type, format, month);
      if (Platform.OS === 'web') {
        const blob = new Blob(
          [format === 'pdf' ? data : JSON.stringify(data, null, 2)],
          { type: format === 'pdf' ? 'application/pdf' : 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}-${month}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        showMessage('Export ready', 'Use the web build to download files directly.');
      }
    } catch (e) {
      showMessage('Export failed', e.message || 'Could not export report.');
    }
  };

  const renderUser = ({ item }) => {
    const active = item.status === 'Active';
    return (
      <View style={styles.userRow}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userMeta}>{item.role} | {item.email}</Text>
        </View>
        <View style={[styles.userStatus, active ? styles.statusActive : styles.statusSuspended]}>
          <Text style={[styles.userStatusText, active ? styles.statusActiveText : styles.statusSuspendedText]}>
            {item.status}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.userButton, busyUserId === item._id && styles.disabled]}
          onPress={() => toggleActive(item)}
          disabled={busyUserId === item._id}
        >
          <Text style={styles.userButtonText}>{active ? 'Suspend' : 'Activate'}</Text>
        </TouchableOpacity>
      </View>
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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Admin Reports</Text>
            <Text style={styles.subtitle}>Sales, activity, and account controls</Text>
          </View>
          <TextInput
            style={styles.monthInput}
            value={month}
            onChangeText={setMonth}
            placeholder="YYYY-MM"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricTile label="Revenue" value={money(sales?.totals?.revenue)} tone="green" />
          <MetricTile label="Order Value" value={money(sales?.totals?.orderValue)} tone="orange" />
          <MetricTile label="Orders" value={sales?.totals?.orders || 0} />
          <MetricTile label="Pending Payments" value={sales?.totals?.pendingPayments || 0} tone="yellow" />
          <MetricTile label="Active Users" value={activity?.activeUsers || 0} tone="green" />
          <MetricTile label="Stock Listings" value={activity?.activity?.stockListings || 0} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monthly Sales</Text>
            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('monthly-sales', 'json')}>
                <Text style={styles.exportText}>JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('monthly-sales', 'pdf')}>
                <Text style={styles.exportText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Payments: {sales?.totals?.payments || 0}</Text>
            <Text style={styles.summaryText}>Successful: {sales?.totals?.successfulPayments || 0}</Text>
            <Text style={styles.summaryText}>Pending: {sales?.totals?.pendingPayments || 0}</Text>
          </View>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Top Vegetables</Text>
            {(sales?.topVegetables || []).slice(0, 6).map((item, idx) => (
              <RankedRow
                key={item.name || idx}
                rank={idx + 1}
                title={item.name || 'Unknown'}
                meta={`${Number(item.quantity || 0).toFixed(1)} kg | ${item.orderCount || 0} orders`}
                value={money(item.revenue)}
              />
            ))}
            {(sales?.topVegetables || []).length === 0 && <Text style={styles.empty}>No sales data.</Text>}
          </View>

          <View style={styles.sectionHalf}>
            <Text style={styles.sectionTitle}>Top Farmers</Text>
            {(sales?.topFarmers || []).slice(0, 6).map((item, idx) => (
              <RankedRow
                key={String(item.farmerId || item.farmerName || idx)}
                rank={idx + 1}
                title={item.farmerName || 'Unknown'}
                meta={`${Number(item.quantity || 0).toFixed(1)} kg sold`}
                value={money(item.revenue)}
              />
            ))}
            {(sales?.topFarmers || []).length === 0 && <Text style={styles.empty}>No farmer sales data.</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity Summary</Text>
            <View style={styles.exportRow}>
              <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('activity-summary', 'json')}>
                <Text style={styles.exportText}>JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('activity-summary', 'pdf')}>
                <Text style={styles.exportText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.metricsGridCompact}>
            <MetricTile label="Orders This Month" value={activity?.activity?.ordersThisMonth || 0} />
            <MetricTile label="Payments This Month" value={activity?.activity?.paymentsThisMonth || 0} />
          </View>
          <Text style={styles.subhead}>Users by role</Text>
          <View style={styles.chipRow}>
            {roleSummary.map((item) => (
              <View key={item._id || 'unknown-role'} style={styles.infoChip}>
                <Text style={styles.infoChipText}>{item._id || 'Unknown'}: {item.count}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.subhead}>Users by status</Text>
          <View style={styles.chipRow}>
            {statusSummary.map((item) => (
              <View key={item._id || 'unknown-status'} style={styles.infoChip}>
                <Text style={styles.infoChipText}>{item._id || 'Unknown'}: {item.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>User Accounts</Text>
            <Text style={styles.countText}>{filteredUsers.length} shown</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder="Search users by name, email, role, status"
            placeholderTextColor="#9ca3af"
          />
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={renderUser}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14
  },
  title: { fontSize: 26, fontWeight: '900', color: '#111827' },
  subtitle: { color: '#64748b', fontWeight: '700', marginTop: 3 },
  monthInput: {
    width: 112,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    color: '#111827',
    fontWeight: '900'
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricsGridCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  metricTile: {
    minWidth: 145,
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  metric_green: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  metric_orange: { borderColor: '#fdba74', backgroundColor: '#fff7ed' },
  metric_yellow: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  metric_default: {},
  metricValue: { color: '#111827', fontSize: 19, fontWeight: '900' },
  metricLabel: { color: '#64748b', fontSize: 12, fontWeight: '800', marginTop: 4 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  twoColumn: { gap: 14 },
  sectionHalf: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, color: '#111827', fontWeight: '900' },
  exportRow: { flexDirection: 'row', gap: 8 },
  exportBtn: { backgroundColor: '#e0f2fe', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 7 },
  exportText: { color: '#0369a1', fontWeight: '900', fontSize: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  summaryText: { color: '#475569', fontWeight: '800' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10
  },
  rankNo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dcfce7',
    color: '#166534',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '900'
  },
  rankMain: { flex: 1 },
  rankTitle: { color: '#111827', fontWeight: '900' },
  rankMeta: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 2 },
  rankValue: { color: '#c2410c', fontWeight: '900' },
  subhead: { color: '#475569', fontWeight: '900', marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 },
  infoChipText: { color: '#334155', fontWeight: '800', fontSize: 12 },
  countText: { color: '#64748b', fontWeight: '800' },
  searchInput: {
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 11,
    color: '#111827',
    fontWeight: '700'
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: '#111827', fontWeight: '900' },
  userMeta: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 2 },
  userStatus: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusSuspended: { backgroundColor: '#fee2e2' },
  userStatusText: { fontWeight: '900', fontSize: 12 },
  statusActiveText: { color: '#166534' },
  statusSuspendedText: { color: '#991b1b' },
  userButton: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  userButtonText: { color: '#1d4ed8', fontWeight: '900', fontSize: 12 },
  empty: { color: '#64748b', fontWeight: '700', marginTop: 10 },
  disabled: { opacity: 0.6 }
});

export default AdminReportsScreen;
