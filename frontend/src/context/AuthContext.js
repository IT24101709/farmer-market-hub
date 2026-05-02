import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

const normalizeAuthPayload = (payload) => {
  if (!payload) return null;

  const user = payload.user || payload;
  if (!user) return null;

  return {
    ...user,
    accessToken: payload.accessToken || payload.token || user.accessToken || user.token,
    refreshToken: payload.refreshToken || user.refreshToken,
  };
};

const authBaseUrl = () => {
  const { apiUrl } = require('../config').default();
  const base = (apiUrl || '').replace(/\/+$/, '');
  return `${base}/auth`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');

        if (storedToken && storedUser) {
          const normalizedUser = normalizeAuthPayload(JSON.parse(storedUser));
          setToken(storedToken);
          setUser(normalizedUser);
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
    const API_URL = authBaseUrl();
    let response;
    try {
      response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
    } catch (err) {
      const hint =
        err?.message?.includes('Failed to fetch')
          ? ' Start the backend, use the same host as this page (localhost vs 127.0.0.1), or set EXPO_PUBLIC_API_URL (e.g. http://localhost:5001/api).'
          : '';
      throw new Error(
        `${err?.message || 'Network error'} — cannot reach ${API_URL}/login.${hint}`
      );
    }

    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Bad response from server (${response.status}). Check API URL: ${API_URL}`);
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Login failed (${response.status})`);
    }

    const normalizedUser = normalizeAuthPayload(data);
    const tokenToStore = normalizedUser?.accessToken;

    if (!tokenToStore) {
      throw new Error('Login succeeded but no token was returned. Check the API response.');
    }
    if (!normalizedUser?.role) {
      throw new Error('Login succeeded but user role is missing. Check the API response.');
    }

    setToken(tokenToStore);
    setUser(normalizedUser);

    await AsyncStorage.setItem('userToken', tokenToStore);
    if (normalizedUser?.refreshToken) await AsyncStorage.setItem('refreshToken', normalizedUser.refreshToken);
    await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));

    return normalizedUser;
  };

  const register = async (name, email, password, role, profileDetails = {}) => {
    const API_URL = authBaseUrl();
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
        const normalizedUser = normalizeAuthPayload(data);
        const tokenToStore = normalizedUser?.accessToken;
        setToken(tokenToStore);
        setUser(normalizedUser);
        
        await AsyncStorage.setItem('userToken', tokenToStore);
        if (normalizedUser?.refreshToken) await AsyncStorage.setItem('refreshToken', normalizedUser.refreshToken);
        await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));
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

  /**
   * Exchange refresh token for a new access token. Returns the new access token or null.
   * Call after a 401 when access JWT expired but refresh is still valid (7d).
   */
  const refreshSession = async () => {
    try {
      const refresh = await AsyncStorage.getItem('refreshToken');
      if (!refresh) return null;

      const API_URL = authBaseUrl();
      const response = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refresh })
      });

      let data = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        return null;
      }

      if (!response.ok || !data.accessToken) {
        return null;
      }

      const accessToken = data.accessToken;
      setToken(accessToken);
      await AsyncStorage.setItem('userToken', accessToken);

      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const nextUser = normalizeAuthPayload({ ...u, accessToken, token: accessToken });
        await AsyncStorage.setItem('userData', JSON.stringify(nextUser));
        setUser(nextUser);
      }

      return accessToken;
    } catch (e) {
      console.error('refreshSession', e);
      return null;
    }
  };

  const updateProfile = async (profileData) => {
    const API_URL = authBaseUrl();
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
      const normalizedUser = normalizeAuthPayload(data);
      setToken(tokenToStore);
      setUser(normalizedUser);
      
      await AsyncStorage.setItem('userToken', tokenToStore);
      if (normalizedUser?.refreshToken) await AsyncStorage.setItem('refreshToken', normalizedUser.refreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));
      
      return normalizedUser;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, updateProfile, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
};
