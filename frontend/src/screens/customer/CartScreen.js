import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  TextInput,
  ScrollView
} from 'react-native';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { createOrder } from '../../services/orderService';

const CartScreen = ({ navigation }) => {
  const { cartItems, totalAmount, updateQuantity, removeFromCart, clearCart } = useContext(CartContext);
  const { user, token, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');

  // ─── Checkout: create order then go to Payment ───────────────────────────
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      const msg = 'Please add some items to your cart first.';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Empty Cart', msg);
      return;
    }
    if (!deliveryAddress.trim()) {
      const msg = 'Please enter a delivery address before checking out.';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Address Required', msg);
      return;
    }
    if (!token) {
      const msg = 'Please log in as a customer to place an order.';
      if (Platform.OS === 'web') { window.alert(msg); return; }
      Alert.alert('Sign in required', msg);
      return;
    }

    setLoading(true);
    try {
      const response = await createOrder(
        {
          customerName: user?.name || 'Customer',
          items: cartItems,
          deliveryAddress: deliveryAddress.trim(),
          note: note.trim()
        },
        token
      );

      if (response.success) {
        const placedOrder = response.data;
        const placedId = placedOrder?._id || placedOrder?.id;
        clearCart();

        // Navigate to Payment screen with order details
        navigation.navigate('Payment', {
          orderId: String(placedId),
          totalAmount: placedOrder?.totalAmount || totalAmount,
          customerName: user?.name || 'Customer'
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      if (error.status === 401) logout();
      const detail = error.errors?.length
        ? error.errors.join('\n')
        : error.message;
      const msg = detail || 'Something went wrong. Please try again.';
      if (Platform.OS === 'web') { window.alert('Checkout failed: ' + msg); return; }
      Alert.alert('Checkout failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Cart Item Row ────────────────────────────────────────────────────────
  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product}</Text>
        <Text style={styles.itemPrice}>LKR {Number(item.price).toFixed(2)} / kg</Text>
      </View>

      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.stockId, Math.max(1, item.quantity - 1))}
        >
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.stockId, item.quantity + 1)}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.itemTotal}>
        LKR {(Number(item.price) * Number(item.quantity)).toFixed(2)}
      </Text>

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeFromCart(item.stockId)}
      >
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Empty State ──────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate('PaymentHistory')}
          >
            <Text style={styles.historyBtnText}>💳 View Payment History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Cart ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Items */}
        <FlatList
          data={cartItems}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.stockId}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={false}
        />

        {/* Delivery Details */}
        <View style={styles.deliverySection}>
          <Text style={styles.sectionTitle}>📍 Delivery Details</Text>

          <Text style={styles.fieldLabel}>Delivery Address *</Text>
          <TextInput
            style={styles.addressInput}
            placeholder="Enter your full delivery address..."
            placeholderTextColor="#adb5bd"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Any special instructions..."
            placeholderTextColor="#adb5bd"
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>🧾 Order Summary</Text>
          {cartItems.map((item) => (
            <View key={item.stockId} style={styles.summaryRow}>
              <Text style={styles.summaryItem} numberOfLines={1}>
                {item.product} × {item.quantity}kg
              </Text>
              <Text style={styles.summaryAmt}>
                LKR {(Number(item.price) * Number(item.quantity)).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>LKR {totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment info hint */}
        <View style={styles.paymentHint}>
          <Text style={styles.paymentHintText}>
            💡 After placing your order, you'll be taken to the payment screen.
            Payment is processed once your order is confirmed by the farmer.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>LKR {totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutBtnText}>Place Order & Pay →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 64, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#757575', marginBottom: 20, fontWeight: '600' },
  shopBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12
  },
  shopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  historyBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10
  },
  historyBtnText: { color: '#1976D2', fontWeight: '700', fontSize: 14 },

  // List
  listContainer: { padding: 14 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2
  },
  itemDetails: { flex: 2 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#212121' },
  itemPrice: { fontSize: 13, color: '#757575', marginTop: 3 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  qtyBtn: {
    backgroundColor: '#EEEEEE',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  qtyValue: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold', color: '#212121' },
  itemTotal: { flex: 1, fontSize: 14, fontWeight: '700', color: '#4CAF50', textAlign: 'right' },
  removeBtn: {
    marginLeft: 10,
    backgroundColor: '#FFEBEE',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeBtnText: { color: '#D32F2F', fontWeight: '900', fontSize: 12 },

  // Delivery
  deliverySection: {
    backgroundColor: '#fff',
    margin: 14,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 14
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#f8f9fa',
    marginBottom: 14,
    minHeight: 72,
    textAlignVertical: 'top'
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#f8f9fa'
  },

  // Summary
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryItem: { color: '#555', fontSize: 14, flex: 1, marginRight: 8 },
  summaryAmt: { color: '#212121', fontSize: 14, fontWeight: '600' },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#212121' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#2E7D32' },

  // Hint
  paymentHint: {
    marginHorizontal: 14,
    marginBottom: 100,
    padding: 14,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  paymentHintText: { color: '#5D4037', fontSize: 13, lineHeight: 20 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  footerTotalLabel: { fontSize: 16, color: '#757575', fontWeight: '600' },
  footerTotalValue: { fontSize: 20, fontWeight: '900', color: '#2E7D32' },
  checkoutBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  checkoutBtnDisabled: { opacity: 0.6 },
  checkoutBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' }
});

export default CartScreen;
