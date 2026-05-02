import axios from 'axios';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/farmer`;

function normalizeAxiosError(error, fallbackMessage) {
  const data = error.response?.data;
  const message =
    typeof data === 'string'
      ? data
      : data?.message || data?.error || error.message || fallbackMessage;
  const err = new Error(message);
  err.status = error.response?.status;
  err.payload = data;
  return err;
}

const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

export const getDashboardInsights = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/insights`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error, 'Failed to load dashboard insights');
  }
};

export const getPriceTrends = async (vegetableName, token) => {
  try {
    const response = await axios.get(`${API_URL}/price-trends/${vegetableName}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error, 'Failed to load price trends');
  }
};

export const getStockStats = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/stock-stats`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    console.warn('Stock stats endpoint not available, using empty dashboard stats');
    return {
      totalStocks: 0,
      totalQuantity: 0,
      availableItems: 0,
      outOfStock: 0,
      lowStockItems: 0,
      criticalSpoilage: 0,
      financialWastage: 0
    };
  }
};

export const getFarmerOrders = async (token) => {
  const response = await axios.get(`${API_URL}/orders`, {
    headers: getAuthHeaders(token)
  });
  return response.data;
};

export const getFarmerOrderById = async (orderId, token) => {
  const response = await axios.get(`${API_URL}/orders/${orderId}`, {
    headers: getAuthHeaders(token)
  });
  return response.data;
};

// Public route for any farmer on the order
export const getFarmerOrderPublic = async (orderId, token) => {
  const response = await axios.get(`${API_URL}/order/${orderId}`, {
    headers: getAuthHeaders(token)
  });
  return response.data;
};

export const confirmFarmerOrder = async (orderId, token) => {
  try {
    const response = await axios.post(
      `${API_URL}/orders/${orderId}/confirm`,
      {},
      { headers: getAuthHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeAxiosError(error, 'Could not confirm order');
  }
};
