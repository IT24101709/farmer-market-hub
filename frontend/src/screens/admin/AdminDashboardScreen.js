import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { getSystemSummary } from '../../services/adminService';
import { useFocusEffect } from '@react-navigation/native';

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
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
      </View>
      
      {summary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>System-Wide Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Active Farmers:</Text>
              <Text style={styles.summaryValue}>{summary.activeFarmersCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Stock (kg):</Text>
              <Text style={styles.summaryValue}>{summary.totalStockKg}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Stock Value:</Text>
              <Text style={styles.summaryValue}>LKR {summary.totalStockValue?.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginHorizontal: 20 }]}>Quick Actions</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FarmerApproval')}>
          <Text style={styles.cardIcon}>✅</Text>
          <Text style={styles.cardTitle}>Approve Farmers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ManageFarmers')}>
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardTitle}>Manage Farmers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ManageCategories')}>
          <Text style={styles.cardIcon}>📁</Text>
          <Text style={styles.cardTitle}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => {}}>
          <Text style={styles.cardIcon}>🛒</Text>
          <Text style={styles.cardTitle}>Manage Orders</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#FF9800', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#FFF' },
  summaryContainer: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  summaryCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height:1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  summaryLabel: { fontSize: 16, color: '#616161' },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#E65100' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20 },
  card: { 
    width: '48%', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width:0, height:1 }, shadowOpacity: 0.1, shadowRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 110
  },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#FF9800', textAlign: 'center' },
  logoutBtn: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#F44336', padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default AdminDashboardScreen;
