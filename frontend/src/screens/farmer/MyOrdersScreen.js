import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const MyOrdersScreen = ({ navigation }) => {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://10.0.2.2:5000/api/farmer/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
    >
      <Text style={styles.orderId}>Order #{item._id?.slice(-8)}</Text>
      <Text style={styles.status}>{item.status}</Text>
      <Text style={styles.total}>LKR {item.totalAmount}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item._id}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  status: { color: '#4CAF50', marginTop: 4 },
  total: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginTop: 8 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 }
});

export default MyOrdersScreen;
