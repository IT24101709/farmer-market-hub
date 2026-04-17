import axios from 'axios';

// Replace with your actual backend URL or use React Native env variables
const API_URL = 'http://localhost:5000/api/stocks';

// You would typically get this from your Auth context or AsyncStorage
const getAuthHeaders = () => {
  // Mock token for development - replace with actual token retrieval
  const token = 'your-jwt-token-here';
  return {
    Authorization: `Bearer ${token}`
  };
};

export const createStock = async (stockData) => {
  try {
    const response = await axios.post(API_URL, stockData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders()
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getMyStocks = async () => {
  try {
    const response = await axios.get(`${API_URL}/my`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getStockById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateStock = async (id, stockData) => {
  try {
    const headers = { ...getAuthHeaders() };
    
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

export const deleteStock = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
