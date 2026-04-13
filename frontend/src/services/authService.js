import apiClient from '../api/client';

export const authService = {
  login: async (email, password, role) => {
    // If role is admin, the backend uses a different endpoint or specific logic
    const endpoint = role === 'admin' ? '/auth/admin/login' : '/auth/login';
    const response = await apiClient.post(endpoint, {
      email,
      password,
      role
    });
    
    // Adjust depending on how token is returned. 
    // Assuming backend standard response: { status: 'success', data: { token: '...', user: {...} } }
    if (response?.data?.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data; // Should return { token, user } inside data
  },

  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  }
};
