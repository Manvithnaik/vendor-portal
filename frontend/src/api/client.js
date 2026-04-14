import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the standard Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the { status, message, data } envelope — callers receive the APIResponse object
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear all session data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('vh_session');
      // Avoid redirect loop if already on /login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Normalize error message from any backend shape
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.detail  ||
      (Array.isArray(error.response?.data?.detail)
        ? error.response.data.detail.map(d => d.msg).join(', ')
        : null) ||
      error.message ||
      'An unexpected error occurred';

    throw new Error(errorMessage);
  }
);

export default apiClient;
