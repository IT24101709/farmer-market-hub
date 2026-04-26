import axios from 'axios';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/stocks`;

// You would typically get this from your Auth context or AsyncStorage
const getAuthHeaders = (token) => {
  return {
    Authorization: `Bearer ${token}`
  };
};

export const createStock = async (stockData, token) => {
  try {
    const response = await axios.post(API_URL, stockData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders(token)
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getMyStocks = async (token, page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${API_URL}/my?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getStockById = async (id, token) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateStock = async (id, stockData, token) => {
  try {
    const headers = { ...getAuthHeaders(token) };
    
    // Check if the data is FormData (when image is updated) or regular JSON
    if (stockData instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      headers['Content-Type'] = 'application/json';
    }

    const response = await axios.put(`${API_URL}/${id}`, stockData, {
      headers
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteStock = async (id, token) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
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
    throw error.response?.data || error.message;
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
    throw error.response?.data || error.message;
  }
};
