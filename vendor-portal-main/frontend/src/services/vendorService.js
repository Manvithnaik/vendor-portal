import apiClient from '../api/client';

export const vendorService = {
  getApplicationStatus: async () => {
    return await apiClient.get('/vendor/application-status');
  },
  
  submitRating: async (data) => {
    return await apiClient.post('/ratings', data);
  },
  
  getVendorRatings: async () => {
    return await apiClient.get('/ratings/vendor');
  }
};
