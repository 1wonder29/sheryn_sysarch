// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',  // ✅ note the /api here
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and reload to show login page
      const message = error.response?.data?.message || 'Session expired';
      if (message.includes('expired') || message.includes('Invalid')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Reload page to show login screen
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;
