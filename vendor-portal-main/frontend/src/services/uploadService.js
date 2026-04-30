import apiClient from '../api/client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/v1';

export const uploadService = {
  /**
   * Upload a PO document (PDF, max 10 MB).
   * Returns { file_url, file_name } from the backend.
   * Uses multipart/form-data — NOT JSON, so raw axios is used with FormData.
   */
  uploadPODocument: async (file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/uploads/po-document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type — browser sets it with boundary automatically
      },
      body: formData,
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json?.message || json?.detail || 'Upload failed');
    }

    // json is APIResponse: { status, message, data: { file_url, file_name } }
    return json.data; // { file_url, file_name }
  },
};
