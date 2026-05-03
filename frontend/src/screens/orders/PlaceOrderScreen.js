import React, { useState, useContext } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { createOrder } from '../../services/orderService';

const PlaceOrderScreen = ({ route, navigation }) => {
  const { product, quantity: maxQty, pricePerKg, farmerId } = route.params || {};
  const { token, user } = useContext(AuthContext);
  
  const [qty, setQty] = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const quantity = Number(qty) || 0;
  const totalAmount = quantity * (pricePerKg || 0);
  const isValid = quantity > 0 && quantity <= (maxQty || 999) && deliveryAddress.trim();

  const handleSubmit = async () => {
    if (!isValid || !token) {
      const msg = 'Please enter valid quantity and delivery address';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const items = [{
        stockId: product?._id,
        product: product?.name,
        quantity,
        price: pricePerKg,
        farmerId
      }];

      await createOrder(
        {
          customerName: user?.name || 'Customer',
          items,
          deliveryAddress: deliveryAddress.trim(),
          note: note.trim()
        },
        token
      );

      if (Platform.OS === 'web') {
        window.alert('Order placed successfully!');
        navigation.goBack();
        return;
      }
      Alert.alert('Success', 'Order placed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      const msg = error.message || 'Failed to place order';
      if (Platform.OS === 'web') { window.alert('Error: ' + msg); return; }
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Place Order</Text>
        
        <View style={styles.card}>
          <Text style={styles.productName}>{product?.name || 'Product'}</Text>
          <Text style={styles.price}>LKR {Number(pricePerKg || 0).toFixed(2)} / kg</Text>
          <Text style={styles.stock}>Available: {maxQty || 0} kg</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Quantity (kg) *</Text>
          <TextInput
            style={styles.input}
            value={qty}
            onChangeText={setQty}
            keyboardType="numeric"
            placeholder="Enter quantity in kg"
            placeholderTextColor="#999"
          />
          {quantity > (maxQty || 0) && (
            <Text style={styles.error}>Maximum available: {maxQty} kg</Text>
          )}
          <Text style={styles.total}>
            Total: LKR {totalAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Delivery Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Enter delivery address"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            placeholder="Any special instructions..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '900', color: '#14532d', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#d1fae5' },
  productName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  price: { fontSize: 18, fontWeight: '700', color: '#166534', marginTop: 6 },
  stock: { fontSize: 14, color: '#64748b', marginTop: 4 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#d1d5db' },
  textArea: { height: 80, textAlignVertical: 'top' },
  error: { color: '#dc2626', fontSize: 12, marginTop: 4 },
  total: { fontSize: 20, fontWeight: '900', color: '#166534', marginTop: 10 },
  button: { backgroundColor: '#15803d', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});

export default PlaceOrderScreen;
