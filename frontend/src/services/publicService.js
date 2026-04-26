import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const getPublicProducts = async () => {
  try {
    const response = await axios.get(`${API_URL}/market/public`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
