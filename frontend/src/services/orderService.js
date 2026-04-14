import apiClient from '../api/client';

// All methods return the full APIResponse { status, message, data, errors }
// Callers use .data to access the inner payload

export const orderService = {
  createOrder: async (data) => {
    // Payload MUST include: { quotation_id, po_document_url, delivery_address, manufacturer_org_id }
    return await apiClient.post('/orders', data);
  },

  listOrders: async (filters = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return await apiClient.get(`/orders${params ? '?' + params : ''}`);
  },

  getOrder: async (orderId) => {
    return await apiClient.get(`/orders/${orderId}`);
  },

  respondToOrder: async (orderId, action, reason = null) => {
    return await apiClient.post(`/orders/${orderId}/vendor-response`, { action, reason });
  },

  getOrderHistory: async (orderId) => {
    return await apiClient.get(`/orders/${orderId}/history`);
  },
};
