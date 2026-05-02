import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/stocks`;

// You would typically get this from your Auth context or AsyncStorage
const getAuthHeaders = (token) => {
  return {
    Authorization: `Bearer ${token}`
  };
};

const handleServiceError = async (error) => {
  const payload = error.response?.data || {};
  const status = error.response?.status;

  if (status === 401) {
    await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData']);
  }

  throw {
    ...payload,
    status,
    message: payload.message || error.message || 'Request failed'
  };
};

export const createStock = async (stockData, token) => {
  try {
    const headers = { ...getAuthHeaders(token) };
    // Let axios/browser set multipart boundary — a bare "multipart/form-data" breaks web uploads.
    if (!(stockData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await axios.post(API_URL, stockData, { headers });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const getMyStocks = async (token, page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${API_URL}/my?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const getAvailableStocks = async (token, params = {}) => {
  try {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });

    const query = searchParams.toString();
    const response = await axios.get(`${API_URL}${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const getStockById = async (id, token) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const updateStock = async (id, stockData, token) => {
  try {
    const headers = { ...getAuthHeaders(token) };
    if (!(stockData instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await axios.put(`${API_URL}/${id}`, stockData, {
      headers
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const updateStockQuantity = async (id, quantity, token) => {
  try {
    const response = await axios.patch(`${API_URL}/${id}/quantity`, { quantity }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token)
      }
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const updateStockPrice = async (id, pricePerKg, token) => {
  try {
    const response = await axios.patch(`${API_URL}/${id}/price`, { pricePerKg }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token)
      }
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const updateStockAvailability = async (id, availabilityStatus, token) => {
  try {
    const response = await axios.patch(`${API_URL}/${id}/availability`, { availabilityStatus }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token)
      }
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const toggleStockVisibility = async (id, token) => {
  try {
    const response = await axios.patch(`${API_URL}/${id}/visibility`, {}, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const deleteStock = async (id, token) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const bulkAddStocks = async (stocksArray, token) => {
  try {
    const response = await axios.post(`${API_URL}/bulk/add`, { stocks: stocksArray }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token)
      }
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};

export const bulkUpdateStocks = async (stocksArray, token) => {
  try {
    const response = await axios.put(`${API_URL}/bulk/update`, { stocks: stocksArray }, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token)
      }
    });
    return response.data;
  } catch (error) {
    await handleServiceError(error);
  }
};
