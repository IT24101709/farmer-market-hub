import React, { useCallback, useContext, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { getSystemSummary } from '../../services/adminService';
import AdminNavBar from '../../components/AdminNavBar';

const formatMoney = (value) => `LKR ${Number(value || 0).toFixed(2)}`;

const SummaryTile = ({ label, value, helper }) => (
  <View style={styles.summaryTile}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
    {!!helper && <Text style={styles.summaryHelper}>{helper}</Text>}
  </View>
);

const ShortcutRow = ({ title, text, action, onPress }) => (
  <TouchableOpacity style={styles.shortcutRow} onPress={onPress} activeOpacity={0.84}>
    <View style={styles.shortcutCopy}>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutText}>{text}</Text>
    </View>
    <Text style={styles.shortcutAction}>{action}</Text>
  </TouchableOpacity>
);

const AdminDashboardScreen = ({ navigation }) => {
  const { user, token, logout } = useContext(AuthContext);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      if (token) {
        const data = await getSystemSummary(token);
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching admin summary:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#166534" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminNavBar navigation={navigation} currentScreen="AdminDashboard" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Welcome back, {user?.name || 'Admin'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile label="Active Farmers" value={summary?.activeFarmersCount || 0} helper="Approved active supplier accounts" />
          <SummaryTile label="Total Stock" value={`${summary?.totalStockKg || 0} kg`} helper="Visible stock quantity" />
          <SummaryTile label="Stock Value" value={formatMoney(summary?.totalStockValue)} helper="Estimated marketplace value" />
          <SummaryTile label="Pending Orders" value={summary?.pendingOrdersCount || 0} helper="Orders waiting for action" />
          <SummaryTile label="Confirmed Orders" value={summary?.confirmedOrdersCount || 0} helper="Orders ready for next steps" />
          <SummaryTile label="Delivered Orders" value={summary?.deliveredOrdersCount || 0} helper="Completed deliveries" />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Admin Workflow</Text>
          <ShortcutRow
            title="Marketplace and stock"
            text="Review farmer stock, update listings, deactivate unavailable products, and remove invalid records."
            action="Open"
            onPress={() => navigation.navigate('Marketplace')}
          />
          <ShortcutRow
            title="Orders and deliveries"
            text="Move orders through confirmation, delivery readiness, assignment, and completion."
            action="Manage"
            onPress={() => navigation.navigate('AdminOrders')}
          />
          <ShortcutRow
            title="Reports and payments"
            text="Inspect payment records, revenue, activity summaries, and account status."
            action="Review"
            onPress={() => navigation.navigate('AdminReports')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4'
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    padding: 18,
    paddingBottom: 42
  },
  hero: {
    backgroundColor: '#166534',
    borderRadius: 8,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18
  },
  heroCopy: {
    flex: 1
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff'
  },
  subtitle: {
    fontSize: 16,
    color: '#dcfce7',
    marginTop: 5,
    fontWeight: '700'
  },
  logoutBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6
  },
  logoutText: {
    color: '#fff',
    fontWeight: '900'
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18
  },
  summaryTile: {
    minWidth: 180,
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  summaryValue: {
    color: '#166534',
    fontSize: 24,
    fontWeight: '900'
  },
  summaryLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 6
  },
  summaryHelper: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16
  },
  panelTitle: {
    color: '#111827',
    fontWeight: '900',
    fontSize: 20,
    marginBottom: 8
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ecfdf5'
  },
  shortcutCopy: {
    flex: 1
  },
  shortcutTitle: {
    color: '#14532d',
    fontWeight: '900',
    fontSize: 16
  },
  shortcutText: {
    color: '#64748b',
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 20
  },
  shortcutAction: {
    color: '#15803d',
    fontWeight: '900'
  }
});

export default AdminDashboardScreen;
