import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Load cart from storage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const storedCart = await AsyncStorage.getItem('userCart');
        if (storedCart) {
          setCartItems(JSON.parse(storedCart));
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    };
    loadCart();
  }, []);

  // Calculate total and save to storage when cart changes
  useEffect(() => {
    const calculateTotal = () => {
      const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      setTotalAmount(total);
    };

    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('userCart', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    };

    calculateTotal();
    saveCart();
  }, [cartItems]);

  const addToCart = (product) => {
    const stockId = product.stockId || product._id;
    const productName = product.name || product.vegetableName || 'Product';
    const farmerRef = product.farmerId;

    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) => item.stockId === stockId);

      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += 1;
        return updatedItems;
      }

      return [
        ...prevItems,
        {
          stockId,
          product: productName,
          price: product.pricePerKg,
          quantity: 1,
          farmerId: farmerRef
        }
      ];
    });
  };

  const removeFromCart = (stockId) => {
    setCartItems(prevItems => prevItems.filter(item => item.stockId !== stockId));
  };

  const updateQuantity = (stockId, newQuantity) => {
    if (newQuantity <= 0) return removeFromCart(stockId);
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.stockId === stockId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = async () => {
    setCartItems([]);
    await AsyncStorage.removeItem('userCart');
  };

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      totalAmount, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart 
    }}>
      {children}
    </CartContext.Provider>
  );
};
