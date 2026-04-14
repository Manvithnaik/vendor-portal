import apiClient from '../api/client';

export const rfqService = {
  createRFQ: async (data) => {
    const response = await apiClient.post('/vendor/rfq', data);
    return response.data; // returns the created RFQ object
  },

  listRFQs: async () => {
    const response = await apiClient.get('/vendor/rfq');
    return response.data; // returns the RFQs array directly
  },

  updateRFQ: async (rfqId, data) => {
    const response = await apiClient.put(`/vendor/rfq/${rfqId}`, data);
    return response.data;
  },
};
