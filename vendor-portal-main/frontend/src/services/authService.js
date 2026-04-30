import apiClient from '../api/client';

export const authService = {
  login: async (email, password, role) => {
    const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/login';
    // response IS the full APIResponse: { status, message, data: { access_token, user_id, ... } }
    const response = await apiClient.post(endpoint, { email, password, role });

    // Backend returns access_token (not 'token')
    if (response?.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }

    return response; // return full APIResponse; callers access result.data
  },

  register: async (data) => {
    // response IS the APIResponse envelope
    const response = await apiClient.post('/auth/register', data);
    return response;
  },

  getCurrentUser: async () => {
    // response IS the APIResponse envelope, caller reads result.data
    const response = await apiClient.get('/auth/me');
    return response;
  },

  logout: () => {
    localStorage.removeItem('token');
  }
};
