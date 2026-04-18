import client from '../api/client';

export const ratingService = {
  createRating: async (data) => {
    const response = await client.post('/ratings/', data);
    return response.data;
  },

  getVendorRatings: async () => {
    const response = await client.get('/ratings/vendor');
    return response.data;
  },

  getManufacturerRatings: async () => {
    const response = await client.get('/ratings/manufacturer');
    return response.data;
  }
};
