import axios from 'axios';
import getEnvVars from '../config';

const { apiUrl } = getEnvVars();
const API_URL = `${apiUrl}/reviews`;

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

export const getReviews = async (token, params = {}) => {
  try {
    const response = await axios.get(API_URL, {
      params,
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load reviews');
  }
};

export const getReviewSummary = async (token, params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/summary`, {
      params,
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to load review summary');
  }
};

export const saveReview = async ({ stockId, rating, comment, orderId }, token) => {
  try {
    const response = await axios.post(
      API_URL,
      { stockId, rating, comment: comment || '', orderId },
      { headers: authHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to save review');
  }
};

export const updateReview = async (reviewId, { rating, comment }, token) => {
  try {
    const response = await axios.put(
      `${API_URL}/${reviewId}`,
      { rating, comment: comment || '' },
      { headers: authHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to update review');
  }
};

export const deleteReview = async (reviewId, token) => {
  try {
    const response = await axios.delete(`${API_URL}/${reviewId}`, {
      headers: authHeaders(token)
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to delete review');
  }
};

export const removeReviewAsAdmin = async (reviewId, reason, token) => {
  try {
    const response = await axios.patch(
      `${API_URL}/${reviewId}/remove`,
      { reason: reason || 'Inappropriate review' },
      { headers: authHeaders(token) }
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, 'Failed to remove review');
  }
};
