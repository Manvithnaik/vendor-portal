import apiClient from '../api/client';

// apiClient interceptor returns the full APIResponse { status, message, data, errors }
// These helpers return that object directly — callers access .data

export const productService = {
  createProduct: async (data) => {
    return await apiClient.post('/products', data);
  },

  listProducts: async (filters = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return await apiClient.get(`/products${params ? '?' + params : ''}`);
  },

  getProduct: async (id) => {
    return await apiClient.get(`/products/${id}`);
  },

  updateProduct: async (id, data) => {
    return await apiClient.put(`/products/${id}`, data);
  },

  deleteProduct: async (id) => {
    return await apiClient.delete(`/products/${id}`);
  },

  getCategories: async () => {
    return await apiClient.get('/products/categories');
  },
};
