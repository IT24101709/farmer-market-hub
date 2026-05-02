import React, { useCallback, useContext, useState } from 'react';
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

const AdminReportsScreen = () => {
  const { token, logout } = useContext(AuthContext);
  const [month, setMonth] = useState(currentMonth());
  const [sales, setSales] = useState(null);
  const [activity, setActivity] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

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
        showMessage('Export ready', 'Export data loaded. Use the web build to download files directly.');
      }
    } catch (e) {
      showMessage('Export failed', e.message || 'Could not export report.');
    }
  };

  const renderUser = ({ item }) => {
    const active = item.status === 'Active';
    return (
      <View style={styles.userRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userMeta}>{item.role} · {item.email}</Text>
        </View>
        <View style={[styles.userStatus, { backgroundColor: active ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={{ color: active ? '#166534' : '#991b1b', fontWeight: '900' }}>{item.status}</Text>
        </View>
        <TouchableOpacity
          style={[styles.userButton, busyUserId === item._id && styles.disabled]}
          onPress={() => toggleActive(item)}
          disabled={busyUserId === item._id}
        >
          <Text style={styles.userButtonText}>{active ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <Text style={styles.title}>Admin Reports</Text>
        <TextInput
          style={styles.monthInput}
          value={month}
          onChangeText={setMonth}
          placeholder="YYYY-MM"
          placeholderTextColor="#9ca3af"
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Sales</Text>
          <Text style={styles.metric}>Revenue: LKR {Number(sales?.totals?.revenue || 0).toFixed(2)}</Text>
          <Text style={styles.metric}>Orders: {sales?.totals?.orders || 0}</Text>
          <Text style={styles.metric}>Pending payments: {sales?.totals?.pendingPayments || 0}</Text>
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('monthly-sales', 'json')}>
              <Text style={styles.exportText}>Export JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('monthly-sales', 'pdf')}>
              <Text style={styles.exportText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top-Selling Vegetables</Text>
          {(sales?.topVegetables || []).slice(0, 5).map((item) => (
            <Text key={item.name} style={styles.listLine}>
              {item.name}: LKR {Number(item.revenue || 0).toFixed(2)} · {Number(item.quantity || 0).toFixed(1)} kg
            </Text>
          ))}
          {(sales?.topVegetables || []).length === 0 && <Text style={styles.empty}>No sales data.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Farmers</Text>
          {(sales?.topFarmers || []).slice(0, 5).map((item) => (
            <Text key={String(item.farmerId || item.farmerName)} style={styles.listLine}>
              {item.farmerName || 'Unknown'}: LKR {Number(item.revenue || 0).toFixed(2)}
            </Text>
          ))}
          {(sales?.topFarmers || []).length === 0 && <Text style={styles.empty}>No farmer sales data.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity Stats</Text>
          <Text style={styles.metric}>Active users: {activity?.activeUsers || 0}</Text>
          <Text style={styles.metric}>Stock listings: {activity?.activity?.stockListings || 0}</Text>
          <Text style={styles.metric}>Orders this month: {activity?.activity?.ordersThisMonth || 0}</Text>
          <Text style={styles.metric}>Payments this month: {activity?.activity?.paymentsThisMonth || 0}</Text>
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('activity-summary', 'json')}>
              <Text style={styles.exportText}>Export JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={() => exportReport('activity-summary', 'pdf')}>
              <Text style={styles.exportText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Accounts</Text>
          <FlatList
            data={users}
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
  container: { flex: 1, backgroundColor: '#fff8f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff8f0' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '900', color: '#e65100' },
  monthInput: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffcc80',
    borderRadius: 10,
    padding: 12,
    color: '#111827',
    fontWeight: '800'
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#ffe0b2' },
  cardTitle: { fontSize: 17, color: '#7c2d12', fontWeight: '900', marginBottom: 8 },
  metric: { color: '#374151', fontWeight: '800', marginTop: 4 },
  listLine: { color: '#475569', fontWeight: '700', marginTop: 6 },
  exportRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  exportBtn: { backgroundColor: '#ffedd5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  exportText: { color: '#c2410c', fontWeight: '900' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  userName: { color: '#111827', fontWeight: '900' },
  userMeta: { color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 2 },
  userStatus: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 },
  userButton: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  userButtonText: { color: '#0369a1', fontWeight: '900', fontSize: 12 },
  empty: { color: '#64748b', fontWeight: '700', marginTop: 8 },
  disabled: { opacity: 0.6 }
});

export default AdminReportsScreen;
