import axios from 'axios';
import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/market`;

const authHeaders = (token) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const getMarketProducts = async (params = {}, token = null) => {
  try {
    const response = await axios.get(API_URL, {
      params,
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const err = new Error(typeof data === 'string' ? data : data?.message || error.message);
    err.status = error.response?.status;
    err.payload = data;
    throw err;
  }
};

export const getMarketProductById = async (id, token = null) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const err = new Error(typeof data === 'string' ? data : data?.message || error.message);
    err.status = error.response?.status;
    err.payload = data;
    throw err;
  }
};
