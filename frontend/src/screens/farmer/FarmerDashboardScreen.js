import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { getDashboardInsights } from '../../services/farmerService';
import { useFocusEffect } from '@react-navigation/native';

const FarmerDashboardScreen = ({ navigation }) => {
  const { user, token, logout } = useContext(AuthContext);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    try {
      if (token) {
        const data = await getDashboardInsights(token);
        setInsights(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInsights();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.name}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('StockList')}
          >
            <Text style={styles.gridItemIcon}>📋</Text>
            <Text style={styles.gridItemText}>Stock Management</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('AddStock')}
          >
            <Text style={styles.gridItemIcon}>➕</Text>
            <Text style={styles.gridItemText}>Add Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('BulkOperations')}
          >
            <Text style={styles.gridItemIcon}>📦</Text>
            <Text style={styles.gridItemText}>Bulk Ops</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('FarmerProfile')}
          >
            <Text style={styles.gridItemIcon}>👤</Text>
            <Text style={styles.gridItemText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('MyOrders')}
          >
            <Text style={styles.gridItemIcon}>📦</Text>
            <Text style={styles.gridItemText}>Orders History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigation.navigate('PaymentHistory')}
          >
            <Text style={styles.gridItemIcon}>💰</Text>
            <Text style={styles.gridItemText}>Payments</Text>
          </TouchableOpacity>
        </View>
      </View>

      {insights && (
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Stock Insights</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Active Stock Value:</Text>
              <Text style={styles.cardValue}>LKR {insights.totalActiveStockValue?.toFixed(2)}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Most Profitable:</Text>
              <Text style={styles.cardValue}>{insights.mostProfitableVegetable?.name}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Turnover Rate:</Text>
              <Text style={styles.cardValue}>{insights.turnoverRate}</Text>
            </View>
          </View>
        </View>
      )}

      {insights?.lowStockAlerts?.length > 0 && (
        <View style={styles.alertsContainer}>
          <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
          {insights.lowStockAlerts.map((alert, index) => (
            <View key={index} style={styles.alertCard}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertTitle}>{alert.vegetableName}</Text>
                <Text style={styles.alertDesc}>Only {alert.quantity} kg remaining.</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {insights?.expiryAlerts?.length > 0 && (
        <View style={styles.alertsContainer}>
          <Text style={styles.sectionTitle}>Expiry Alerts (Next 3 Days)</Text>
          {insights.expiryAlerts.map((alert, index) => (
            <View key={index} style={styles.alertCardExpiry}>
              <Text style={styles.alertIcon}>⏳</Text>
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertTitleExpiry}>{alert.vegetableName}</Text>
                <Text style={styles.alertDesc}>Expiring on {new Date(alert.expiryDate).toLocaleDateString()}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gridItemIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  insightsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardLabel: {
    fontSize: 16,
    color: '#616161',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  alertsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertCardExpiry: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
  },
  alertTitleExpiry: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B71C1C',
  },
  alertDesc: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  }
});

export default FarmerDashboardScreen;
