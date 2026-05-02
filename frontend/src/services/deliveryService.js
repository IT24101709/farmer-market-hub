import axios from 'axios';
import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/deliveries`;
const ADMIN_API_URL = `${apiUrl}/admin`;

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
});

function normalizeError(error, fallback) {
  const data = error.response?.data;
  const msg = typeof data === 'string' ? data : data?.message || data?.error || error.message || fallback;
  const err = new Error(msg);
  err.status = error.response?.status;
  err.payload = data;
  return err;
}

// ============ New Delivery APIs (per-order) ============

// Create delivery (admin)
export const createDelivery = async (body, token) => {
  try {
    const response = await axios.post(API_URL, body, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to create delivery');
  }
};

// Get all deliveries (admin)
export const getAllDeliveries = async (token, params = {}) => {
  try {
    const response = await axios.get(API_URL, {
      params,
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load deliveries');
  }
};

// Get agent's deliveries (agent only)
export const getMyDeliveries = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/my`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load my deliveries');
  }
};

// Get delivery by ID
export const getDeliveryById = async (deliveryId, token) => {
  try {
    const response = await axios.get(`${API_URL}/${deliveryId}`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load delivery');
  }
};

// Get delivery by order ID
export const getDeliveryByOrderId = async (orderId, token) => {
  try {
    const response = await axios.get(`${API_URL}/order/${orderId}`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load delivery for order');
  }
};

// Assign agent (admin)
export const assignAgent = async (deliveryId, agentId, token) => {
  try {
    const response = await axios.patch(`${API_URL}/${deliveryId}/assign`, { agentId }, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to assign agent');
  }
};

// Update delivery status (agent)
export const updateDeliveryStatus = async (deliveryId, status, token) => {
  try {
    const response = await axios.patch(`${API_URL}/${deliveryId}/status`, { status }, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to update status');
  }
};

// Cancel delivery (admin)
export const cancelDelivery = async (deliveryId, token) => {
  try {
    const response = await axios.patch(`${API_URL}/${deliveryId}/cancel`, {}, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to cancel delivery');
  }
};

// ============ Legacy Delivery Agent APIs ============

export const getDashboard = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/dashboard`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load dashboard');
  }
};

export const getTodayDeliveries = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/today`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load deliveries');
  }
};

export const getDeliveryHistory = async (token, page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${API_URL}/history`, {
      params: { page, limit },
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load history');
  }
};

export const shipOrder = async (orderId, token) => {
  try {
    const response = await axios.put(
      `${API_URL}/ship/${orderId}`,
      {},
      { headers: authHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to ship order');
  }
};

// ============ Admin APIs ============

export const getAllDeliveriesAdmin = async (token, query = {}) => {
  try {
    const response = await axios.get(`${ADMIN_API_URL}/deliveries`, {
      params: query,
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load deliveries');
  }
};

export const assignDelivery = async (body, token) => {
  try {
    const response = await axios.post(`${ADMIN_API_URL}/deliveries/assign`, body, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to assign delivery');
  }
};

export const getDeliveryAgents = async (token) => {
  try {
    const response = await axios.get(`${ADMIN_API_URL}/delivery-agents`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load agents');
  }
};

export const getPendingShipments = async (token) => {
  try {
    const response = await axios.get(`${ADMIN_API_URL}/shipments/pending`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load shipments');
  }
};

export const getDeliveryStats = async (token, days = 7) => {
  try {
    const response = await axios.get(`${ADMIN_API_URL}/deliveries/stats`, {
      params: { days },
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load stats');
  }
};
