import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import getEnvVars from '../../config';

const { apiUrl } = getEnvVars();

const CartScreen = ({ navigation }) => {
  const { cartItems, totalAmount, updateQuantity, removeFromCart, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add some items to your cart first.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${apiUrl}/orders`, {
        customerName: user.name || 'Valued Customer',
        items: cartItems
      });

      if (response.data.success) {
        Alert.alert(
          'Order Placed!', 
          'Your order has been placed successfully.',
          [{ text: 'OK', onPress: () => {
            clearCart();
            navigation.navigate('Marketplace');
          }}]
        );
      }
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Checkout Failed', error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product}</Text>
        <Text style={styles.itemPrice}>LKR {item.price} / kg</Text>
      </View>
      
      <View style={styles.quantityContainer}>
        <TouchableOpacity 
          style={styles.qtyBtn} 
          onPress={() => updateQuantity(item.stockId, Math.max(0, item.quantity - 1))}
        >
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{item.quantity}</Text>
        <TouchableOpacity 
          style={styles.qtyBtn} 
          onPress={() => updateQuantity(item.stockId, item.quantity + 1)}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.itemTotal}>LKR {(item.price * item.quantity).toFixed(2)}</Text>

      <TouchableOpacity 
        style={styles.removeBtn} 
        onPress={() => removeFromCart(item.stockId)}
      >
        <Text style={styles.removeBtnText}>X</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity 
            style={styles.shopBtn}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={item => item.stockId}
            contentContainerStyle={styles.listContainer}
          />
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>LKR {totalAmount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity 
              style={styles.checkoutBtn} 
              onPress={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#757575',
    marginBottom: 20,
  },
  shopBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemDetails: {
    flex: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  qtyBtn: {
    backgroundColor: '#EEEEEE',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  qtyValue: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemTotal: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
  removeBtn: {
    marginLeft: 10,
    backgroundColor: '#FFEBEE',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 12,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    color: '#757575',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  checkoutBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

export default CartScreen;
