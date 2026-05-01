import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const OrderDetailsScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { token } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`http://10.0.2.2:5000/api/farmer/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Order Details</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Status: {order?.status}</Text>
        <Text style={styles.label}>Total: LKR {order?.totalAmount}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.subtitle}>Items:</Text>
        {order?.items?.map((item, idx) => (
          <Text key={idx} style={styles.item}>{item.name} - {item.quantity}kg x LKR{item.price}</Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  section: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  label: { fontSize: 16, color: '#555', marginBottom: 8 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  item: { fontSize: 14, color: '#666', marginBottom: 4 }
});

export default OrderDetailsScreen;
