import axios from 'axios';
import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/payments`;

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
  return err;
}

// POST /api/payments/process — Customer pays for a CONFIRMED order
export const processPayment = async ({ orderId, paymentMethod, note }, token) => {
  try {
    const response = await axios.post(
      `${API_URL}/process`,
      { orderId, paymentMethod, note: note || '' },
      { headers: authHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to process payment');
  }
};

// GET /api/payments/my — Customer's own payment history
export const getMyPayments = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/my`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load payment history');
  }
};

// GET /api/payments/overview — Admin stats
export const getPaymentOverview = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/overview`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load payment overview');
  }
};

// GET /api/payments/order/:orderId — Payment for a specific order
export const getPaymentByOrderId = async (orderId, token) => {
  try {
    const response = await axios.get(`${API_URL}/order/${orderId}`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load payment');
  }
};

// GET /api/payments/:id — Single payment by ID
export const getPaymentById = async (paymentId, token) => {
  try {
    const response = await axios.get(`${API_URL}/${paymentId}`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load payment');
  }
};
