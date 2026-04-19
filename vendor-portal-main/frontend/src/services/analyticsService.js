import apiClient from '../api/client';

export const analyticsService = {
  getManufacturerOverview: (orgId, range = '30d') => 
    apiClient.get(`/analytics/manufacturer/${orgId}/overview`, { params: { range } }),

  getVendorOverview: (orgId, range = '30d') => 
    apiClient.get(`/analytics/vendor/${orgId}/overview`, { params: { range } })
};
