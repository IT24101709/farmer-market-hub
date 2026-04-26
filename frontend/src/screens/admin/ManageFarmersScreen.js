import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { getAllFarmers, toggleFarmerStatus } from '../../services/adminService';

const ManageFarmersScreen = () => {
  const { token } = useContext(AuthContext);
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFarmers = async () => {
    try {
      if (token) {
        const data = await getAllFarmers(token);
        setFarmers(data);
      }
    } catch (error) {
      console.error('Error fetching farmers:', error);
      Alert.alert('Error', 'Failed to load farmers list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFarmers();
  };

  const handleToggleStatus = async (farmer) => {
    const action = farmer.status === 'Active' ? 'Suspend' : 'Activate';
    
    Alert.alert(
      `${action} Account`,
      `Are you sure you want to ${action.toLowerCase()} ${farmer.name}'s account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: action, 
          style: farmer.status === 'Active' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await toggleFarmerStatus(farmer._id, token);
              Alert.alert('Success', res.message);
              // Update local state
              setFarmers(farmers.map(f => f._id === farmer._id ? { ...f, status: res.status } : f));
            } catch (error) {
              Alert.alert('Error', error.message || `Failed to ${action.toLowerCase()} account`);
            }
          }
        }
      ]
    );
  };

  const renderFarmer = ({ item }) => {
    const isSuspended = item.status === 'Suspended';
    const isPending = !item.isApproved;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.farmerName}>{item.name}</Text>
          <View style={[
            styles.badge, 
            isSuspended ? styles.badgeSuspended : (isPending ? styles.badgePending : styles.badgeActive)
          ]}>
            <Text style={styles.badgeText}>
              {isSuspended ? 'Suspended' : (isPending ? 'Pending' : 'Active')}
            </Text>
          </View>
        </View>
        
        <Text style={styles.farmerEmail}>{item.email}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active Listings</Text>
            <Text style={styles.statValue}>{item.activeListingsCount || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Stock (kg)</Text>
            <Text style={styles.statValue}>{item.totalStockKg || 0}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, isSuspended ? styles.btnActivate : styles.btnSuspend]}
          onPress={() => handleToggleStatus(item)}
        >
          <Text style={styles.actionBtnText}>
            {isSuspended ? 'Activate Account' : 'Suspend Account'}
          </Text>
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
    <View style={styles.container}>
      {farmers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No farmers found in the system.</Text>
        </View>
      ) : (
        <FlatList
          data={farmers}
          renderItem={renderFarmer}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 15, paddingBottom: 40 },
  emptyText: { fontSize: 16, color: '#757575' },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  farmerName: { fontSize: 18, fontWeight: 'bold', color: '#212121' },
  farmerEmail: { fontSize: 14, color: '#757575', marginBottom: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#E8F5E9' },
  badgeSuspended: { backgroundColor: '#FFEBEE' },
  badgePending: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#616161', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#FF9800' },
  actionBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnSuspend: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#F44336' },
  btnActivate: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#4CAF50' },
  actionBtnText: { fontWeight: 'bold', color: '#333' }
});

export default ManageFarmersScreen;
