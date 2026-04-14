import apiClient from '../api/client';

export const quoteService = {
  /**
   * Vendor submits a quotation in response to an RFQ.
   * QuoteCreate requires: { rfq_id, price, lead_time_days, compliance_notes? }
   * lead_time_days is REQUIRED (no default in backend schema).
   */
  submitQuote: async (data) => {
    const response = await apiClient.post('/vendor/rfq/quote', data);
    return response.data; // returns the created Quote object
  },

  /**
   * List all quotes for a given RFQ.
   * Returns the quotes array directly.
   */
  listQuotes: async (rfqId) => {
    const response = await apiClient.get(`/vendor/rfq/${rfqId}/quotes`);
    return response.data; // returns quotes array directly
  },

  /**
   * Manufacturer selects one quote from an RFQ.
   * Locks the chosen quote, rejects others, closes the RFQ.
   */
  selectQuote: async (rfqId, quoteId) => {
    const response = await apiClient.post(`/vendor/rfq/${rfqId}/select-quote/${quoteId}`);
    return response.data; // returns { quote_id, rfq_id, message }
  },
};
