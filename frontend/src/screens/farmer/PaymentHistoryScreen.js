import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const PaymentHistoryScreen = ({ navigation }) => {
  const { token } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await axios.get('http://10.0.2.2:5000/api/farmer/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderPayment = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.amount}>LKR {item.amount}</Text>
      <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
      <Text style={styles.status}>{item.status}</Text>
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        renderItem={renderPayment}
        keyExtractor={item => item._id}
        ListEmptyComponent={<Text style={styles.empty}>No payments yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  amount: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32' },
  date: { color: '#666', marginTop: 4 },
  status: { color: '#4CAF50', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 }
});

export default PaymentHistoryScreen;
