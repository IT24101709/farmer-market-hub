import axios from 'axios';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/admin`;

// Mock token for development - replace with actual token retrieval from AuthContext/AsyncStorage
const getAuthHeaders = (token) => {
  return {
    Authorization: `Bearer ${token}`
  };
};

export const getSystemSummary = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/summary`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllFarmers = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/farmers`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const toggleFarmerStatus = async (farmerId, token) => {
  try {
    const response = await axios.patch(`${API_URL}/farmers/${farmerId}/toggle-status`, {}, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
