import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { processPayment } from '../../services/paymentService';

const METHODS = [
  { key: 'CASH', label: '💵  Cash on Delivery' },
  { key: 'CARD', label: '💳  Credit / Debit Card' },
  { key: 'BANK_TRANSFER', label: '🏦  Bank Transfer' }
];

const PaymentScreen = ({ route, navigation }) => {
  const { orderId, totalAmount, customerName } = route.params || {};
  const { token } = useContext(AuthContext);
  const [selectedMethod, setSelectedMethod] = useState('CASH');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!selectedMethod) {
      const msg = 'Please select a payment method.';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Select Method', msg);
      return;
    }

    const confirm = () => {
      if (Platform.OS === 'web') {
        return window.confirm(
          `Pay LKR ${Number(totalAmount || 0).toFixed(2)} via ${selectedMethod}?`
        );
      }
      return true; // Alert.alert handled below for native
    };

    const doPayment = async () => {
      setLoading(true);
      try {
        await processPayment({ orderId, paymentMethod: selectedMethod }, token);
        const msg = '✅ Payment processed successfully! Your order is now being handled.';
        if (Platform.OS === 'web') {
          window.alert(msg);
          navigation.navigate('CustomerOrderDetail', { orderId });
        } else {
          Alert.alert('Payment Successful', msg, [
            {
              text: 'View Order',
              onPress: () => navigation.navigate('CustomerOrderDetail', { orderId })
            }
          ]);
        }
      } catch (e) {
        const msg = e.message || 'Failed to process payment.';
        if (Platform.OS === 'web') { window.alert('Error: ' + msg); }
        else { Alert.alert('Payment Error', msg); }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm()) doPayment();
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay LKR ${Number(totalAmount || 0).toFixed(2)} via ${selectedMethod}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: doPayment }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Order Summary */}
        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>ORDER SUMMARY</Text>
          <Text style={styles.orderName}>{customerName || 'Your Order'}</Text>
          <Text style={styles.orderRef}>ID: ...{String(orderId || '').slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderTotal}>
            LKR {Number(totalAmount || 0).toFixed(2)}
          </Text>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.methodCard, selectedMethod === m.key && styles.methodCardActive]}
            onPress={() => setSelectedMethod(m.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.methodLabel, selectedMethod === m.key && styles.methodLabelActive]}>
              {m.label}
            </Text>
            {selectedMethod === m.key && (
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.payBtn, loading && styles.payBtnDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>
              Pay LKR {Number(totalAmount || 0).toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate('CustomerOrderDetail', { orderId })}
        >
          <Text style={styles.skipBtnText}>View Order Status →</Text>
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            ℹ️  Payment can only be processed after the farmer confirms your order.
            You can always pay later from your order details.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  content: { padding: 18, paddingBottom: 40 },
  orderCard: {
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28
  },
  orderLabel: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  orderName: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  orderRef: { color: '#bfdbfe', fontSize: 13, marginBottom: 12 },
  orderTotal: { color: '#fff', fontSize: 32, fontWeight: '900' },
  sectionTitle: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14
  },
  methodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  methodCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  methodLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  methodLabelActive: { color: '#1d4ed8' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 14 },
  payBtn: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center'
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  skipBtn: {
    marginTop: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  skipBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '700' },
  noteBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#93c5fd'
  },
  noteText: { color: '#1e3a5f', fontSize: 13, lineHeight: 20 }
});

export default PaymentScreen;
