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

  const login = async (identifier, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
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

  const register = async (name, email, password, role, profileDetails = {}) => {
    try {
      console.log('📝 Registering user:', { name, email, role });
      
      const payload = { name, email, password, role, profileDetails };
      console.log('📨 Sending registration request to:', `${API_URL}/register`);
      
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      console.log('📥 Server response status:', response.status);
      console.log('📥 Server response data:', data);
      
      if (!response.ok) {
        const errorMessage = data.message || data.error || 'Registration failed';
        console.error('❌ Registration failed - Status:', response.status, 'Message:', errorMessage);
        throw new Error(errorMessage);
      }

      // Only set token and user if farmer is approved or not a farmer
      if (data.accessToken || data.token) {
        const tokenToStore = data.accessToken || data.token;
        setToken(tokenToStore);
        setUser(data);
        
        await AsyncStorage.setItem('userToken', tokenToStore);
        if (data.refreshToken) await AsyncStorage.setItem('refreshToken', data.refreshToken);
        await AsyncStorage.setItem('userData', JSON.stringify(data));
        console.log('✅ User data stored in AsyncStorage');
      } else if (role === 'Farmer' && !data.isApproved) {
        // For farmers awaiting approval, do NOT set user state or token.
        // This keeps them on the Registration screen so they can see the success message.
        console.log('⏳ Farmer registration pending approval');
        return {
          ...data,
          message: data.message || 'Registration successful! Please wait for admin approval.'
        };
      }
      
      console.log('✅ Registration complete');
      return data;
    } catch (error) {
      console.error('❌ Registration error:', error);
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
