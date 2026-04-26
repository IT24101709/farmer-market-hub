import axios from 'axios';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = apiUrl;

export const getPublicProducts = async () => {
  try {
    const response = await axios.get(`${API_URL}/market/public`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
