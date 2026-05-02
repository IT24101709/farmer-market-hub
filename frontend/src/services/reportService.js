import axios from 'axios';
import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/reports`;

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

export const getMonthlySalesReport = async (token, month) => {
  try {
    const response = await axios.get(`${API_URL}/monthly-sales`, {
      params: { month },
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load monthly sales report');
  }
};

export const getActivityReport = async (token, month) => {
  try {
    const response = await axios.get(`${API_URL}/activity`, {
      params: { month },
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load activity report');
  }
};

export const setUserActiveStatus = async (userId, active, token) => {
  try {
    const response = await axios.patch(
      `${API_URL}/users/${userId}/active-status`,
      { active },
      { headers: authHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to update user status');
  }
};

export const getReportExportUrl = (type, format, month) => {
  const query = new URLSearchParams({
    type,
    format,
    month: month || ''
  });
  return `${API_URL}/export?${query.toString()}`;
};

export const exportReportData = async (token, type, format, month) => {
  try {
    const response = await axios.get(`${API_URL}/export`, {
      params: { type, format, month },
      headers: authHeaders(token),
      responseType: format === 'pdf' ? 'arraybuffer' : 'json'
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to export report');
  }
};
