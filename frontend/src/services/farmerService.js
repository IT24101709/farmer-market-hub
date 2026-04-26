import axios from 'axios';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/farmer`;

// Mock token for development - replace with actual token retrieval from AuthContext/AsyncStorage
const getAuthHeaders = () => {
  const token = 'your-jwt-token-here'; // Ideally passed from somewhere or stored globally
  return {
    Authorization: `Bearer ${token}`
  };
};

export const getDashboardInsights = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/insights`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPriceTrends = async (vegetableName, token) => {
  try {
    const response = await axios.get(`${API_URL}/price-trends/${vegetableName}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
