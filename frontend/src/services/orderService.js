import axios from 'axios';
import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/orders`;

const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

export const getMyFarmerOrders = async (token, status = 'All', page = 1, limit = 20) => {
  try {
    const params = { farmerOrders: true, status, page, limit };
    const response = await axios.get(API_URL, { 
      headers: getAuthHeaders(token),
      params 
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getOrderDetails = async (id, token) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateOrderStatus = async (id, status, token) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, { status }, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
