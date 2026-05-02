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

// ============ Dashboard Analytics ============

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

// ============ Farmer Management ============

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

export const suspendFarmer = async (farmerId, token, reason) => {
  try {
    const response = await axios.patch(`${API_URL}/farmers/${farmerId}/suspend`, { reason }, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const reactivateFarmer = async (farmerId, token) => {
  try {
    const response = await axios.patch(`${API_URL}/farmers/${farmerId}/reactivate`, {}, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteFarmer = async (farmerId, token) => {
  try {
    const response = await axios.delete(`${API_URL}/farmers/${farmerId}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const assignRegion = async (farmerId, region, token) => {
  try {
    const response = await axios.patch(`${API_URL}/farmers/${farmerId}/region`, { region }, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const exportFarmers = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/farmers/export`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ User Management ============

export const getAllUsers = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const toggleUserStatus = async (userId, token) => {
  try {
    const response = await axios.patch(`${API_URL}/users/${userId}/toggle-status`, {}, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ Order Management ============

export const getAdminOrders = async (token, params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/orders`, {
      headers: getAuthHeaders(token),
      params
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateOrderStatus = async (orderId, status, notes, token) => {
  try {
    const response = await axios.put(`${API_URL}/orders/${orderId}/status`, { status, notes }, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const assignDeliveryAgent = async (orderId, agentId, token) => {
  try {
    const response = await axios.post(`${API_URL}/orders/${orderId}/assign-agent`, { agentId }, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPendingShipments = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/shipments/pending`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ Delivery Agent Management ============

export const getDeliveryAgents = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/delivery-agents`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============ Stock/Product Management ============

export const getAdminStocks = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/stocks`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const toggleProductVisibility = async (stockId, token) => {
  try {
    const response = await axios.patch(`${API_URL}/stocks/${stockId}/visibility`, {}, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const removeProduct = async (stockId, reason, token) => {
  try {
    const response = await axios.delete(`${API_URL}/stocks/${stockId}?reason=${encodeURIComponent(reason)}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Legacy function for backward compatibility
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
