import { apiClient } from './client';

export const permissionsApi = {
  getPermissions: (docId) =>
    apiClient(`/api/v1/documents/${docId}/permissions`),

  grantPermission: (docId, userEmail, permissionLevel) =>
    apiClient(`/api/v1/documents/${docId}/permissions`, {
      method: 'POST',
      body: {
        user_email: userEmail,
        permission_level: permissionLevel,
      },
    }),

  updatePermission: (docId, permId, permissionLevel) =>
    apiClient(`/api/v1/documents/${docId}/permissions/${permId}`, {
      method: 'PUT',
      body: {
        permission_level: permissionLevel,
      },
    }),

  revokePermission: (docId, permId) =>
    apiClient(`/api/v1/documents/${docId}/permissions/${permId}`, {
      method: 'DELETE',
    }),
};
