import apiClient from '../api/client';

export const orderService = {
  createOrder: async (data) => {
    // Payload MUST include: { quotation_id, po_document_url, delivery_address, manufacturer_org_id }
    const response = await apiClient.post('/orders', data);
    return response.data;
  },

  listOrders: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await apiClient.get(`/orders?${params}`);
    return response.data;
  },

  getOrder: async (orderId) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },

  respondToOrder: async (orderId, action, reason = null) => {
    const response = await apiClient.post(`/orders/${orderId}/vendor-response`, {
      action,
      reason
    });
    return response.data;
  },

  getOrderHistory: async (orderId) => {
    const response = await apiClient.get(`/orders/${orderId}/history`);
    return response.data;
  }
};
