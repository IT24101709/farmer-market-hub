import axios from 'axios';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/orders`;

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

function normalizeError(error, fallback) {
  const data = error.response?.data;
  const msg =
    typeof data === 'string'
      ? data
      : data?.message || data?.error || error.message || fallback;
  const err = new Error(msg);
  err.status = error.response?.status;
  err.payload = data;
  err.errors = data?.errors;
  return err;
}

export const createOrder = async ({ customerName, items }, token) => {
  try {
    const response = await axios.post(
      API_URL,
      { customerName, items },
      { headers: authHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to place order');
  }
};

export const getMyOrders = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/my`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load orders');
  }
};

export const getOrderById = async (orderId, token) => {
  try {
    const response = await axios.get(`${API_URL}/${orderId}`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load order');
  }
};

export const updateOrder = async (orderId, body, token) => {
  try {
    const response = await axios.put(`${API_URL}/${orderId}`, body, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to update order');
  }
};
