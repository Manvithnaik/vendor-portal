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
      // Check if this is an admin session hitting a user-only endpoint
      // (admin tokens are rejected by get_current_user deps).
      // Don't wipe admin session for those failures — just throw.
      const session = (() => { try { return JSON.parse(localStorage.getItem('vh_session') || '{}'); } catch { return {}; } })();
      const isAdminSession = session?.role === 'admin';

      if (!isAdminSession) {
        // Regular user token expired — clear session and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('vh_session');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      // For admins: let the error propagate — page catch() handles it silently
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
