import apiClient from '../api/client';

// All methods return full APIResponse { status, message, data, errors }

export const quoteService = {
  /**
   * Vendor submits a quotation in response to an RFQ.
   * QuoteCreate requires: { rfq_id, price, lead_time_days, compliance_notes? }
   */
  submitQuote: async (data) => {
    return await apiClient.post('/vendor/rfq/quote', data);
  },

  /** List all quotes for a given RFQ. */
  listQuotes: async (rfqId) => {
    return await apiClient.get(`/vendor/rfq/${rfqId}/quotes`);
  },

  /**
   * Manufacturer selects one quote from an RFQ.
   * Locks the chosen quote, rejects others, closes the RFQ.
   */
  selectQuote: async (rfqId, quoteId) => {
    return await apiClient.post(`/vendor/rfq/${rfqId}/select-quote/${quoteId}`);
  },

  /** List my quotes for checking which RFQs I've replied to */
  myQuotes: async () => {
    return await apiClient.get('/vendor/my-quotes');
  },
};
