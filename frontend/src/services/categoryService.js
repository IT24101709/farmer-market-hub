import axios from 'axios';

const API_URL = 'http://localhost:5000/api/categories';

const getAuthHeaders = (token) => {
  return {
    Authorization: `Bearer ${token}`
  };
};

export const getCategories = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createCategory = async (categoryData, token) => {
  try {
    const response = await axios.post(API_URL, categoryData, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateCategory = async (id, categoryData, token) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, categoryData, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const deleteCategory = async (id, token) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
