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
    setCartItems(prevItems => {
      // Check if product already exists in cart (by stockId)
      const existingItemIndex = prevItems.findIndex(item => item.stockId === product.stockId);
      
      if (existingItemIndex >= 0) {
        // Increase quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += 1; // Default add 1 kg
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, { 
          stockId: product.stockId, 
          product: product.vegetableName, 
          price: product.pricePerKg, 
          quantity: 1, // Default quantity
          farmerId: product.farmerId
        }];
      }
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
