import { apiClient } from './client';

export const documentsApi = {
  getDocuments: ({ search = '', category = '', view_mode = '', page = 1, limit = 10 } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (view_mode) params.append('view_mode', view_mode);
    params.append('page', page);
    params.append('limit', limit);
    return apiClient(`/api/v1/documents?${params.toString()}`);
  },

  getDocument: (id) =>
    apiClient(`/api/v1/documents/${id}`),

  uploadDocument: (formData) =>
    apiClient('/api/v1/documents/upload', {
      method: 'POST',
      body: formData,
    }),

  updateMetadata: (id, metadata) =>
    apiClient(`/api/v1/documents/${id}/metadata`, {
      method: 'PUT',
      body: metadata,
    }),

  deleteDocument: (id) =>
    apiClient(`/api/v1/documents/${id}`, {
      method: 'DELETE',
    }),

  downloadDocument: async (id, originalFilename) => {
    const blob = await apiClient(`/api/v1/documents/${id}/download`);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
