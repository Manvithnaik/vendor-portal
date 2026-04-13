import apiClient from '../api/client';

export const rfqService = {
  createRFQ: async (data) => {
    const response = await apiClient.post('/vendor/rfq', data);
    return response.data;
  },

  listRFQs: async () => {
    const response = await apiClient.get('/vendor/rfq');
    return response.data;
  }
};

