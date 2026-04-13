import apiClient from '../api/client';

export const quoteService = {
  submitQuote: async (data) => {
    const response = await apiClient.post('/vendor/rfq/quote', data);
    return response.data;
  },

  listQuotes: async (rfqId) => {
    const response = await apiClient.get(`/vendor/rfq/${rfqId}/quotes`);
    return response.data;
  },

  selectQuote: async (rfqId, quoteId) => {
    const response = await apiClient.post(`/vendor/rfq/${rfqId}/select-quote/${quoteId}`);
    return response.data;
  }
};
