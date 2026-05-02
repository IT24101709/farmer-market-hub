import axios from 'axios';

import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/notifications`;

const headers = (token) => ({
  Authorization: `Bearer ${token}`
});

export const fetchNotifications = async (token) => {
  const response = await axios.get(API_URL, { headers: headers(token) });
  return response.data;
};

export const markNotificationRead = async (id, token) => {
  const response = await axios.patch(`${API_URL}/${id}/read`, {}, { headers: headers(token) });
  return response.data;
};

export const markAllNotificationsRead = async (token) => {
  const response = await axios.patch(`${API_URL}/read-all`, {}, { headers: headers(token) });
  return response.data;
};
