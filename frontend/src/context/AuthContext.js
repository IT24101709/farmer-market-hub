import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to get base URL
  const { apiUrl } = require('../config').default();
  const API_URL = `${apiUrl}/auth`;

  useEffect(() => {
    // Check if user is logged in
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load user data', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.accessToken || data.token); // Fallback to token if backend not fully updated
      setUser(data);
      
      await AsyncStorage.setItem('userToken', data.accessToken || data.token);
      if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Only set token and user if farmer is approved or not a farmer
      if (data.accessToken || data.token) {
        const tokenToStore = data.accessToken || data.token;
        setToken(tokenToStore);
        setUser(data);
        
        await AsyncStorage.setItem('userToken', tokenToStore);
        if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      } else if (role === 'Farmer' && !data.isApproved) {
        // For farmers awaiting approval, do NOT set user state or token.
        // This keeps them on the Registration screen so they can see the success message.
        return {
          ...data,
          message: data.message || 'Registration successful! Please wait for admin approval.'
        };
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userData');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      const tokenToStore = data.accessToken || data.token;
      setToken(tokenToStore);
      setUser(data);
      
      await AsyncStorage.setItem('userToken', tokenToStore);
      if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(data));
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
