import apiClient from '../api/client';

// Returns full APIResponse { status, message, data, errors }
export const rfqService = {
  createRFQ: async (data) => {
    return await apiClient.post('/vendor/rfq', data);
  },

  listRFQs: async () => {
    return await apiClient.get('/vendor/rfq');
  },

  updateRFQ: async (rfqId, data) => {
    return await apiClient.put(`/vendor/rfq/${rfqId}`, data);
  },
};
