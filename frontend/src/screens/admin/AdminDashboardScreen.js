import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const AdminDashboardScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
      
      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => {}}>
          <Text style={styles.cardTitle}>View Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FarmerApproval')}>
          <Text style={styles.cardTitle}>Approve Farmers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => {}}>
          <Text style={styles.cardTitle}>Approve Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => {}}>
          <Text style={styles.cardTitle}>Manage Orders</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F7FA' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#212121', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#757575', marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    width: '48%', 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 10, 
    marginBottom: 15,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center' },
  logoutBtn: { marginTop: 'auto', backgroundColor: '#F44336', padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default AdminDashboardScreen;
