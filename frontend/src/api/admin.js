import { apiClient } from './client';

export const adminApi = {
  getStats: () =>
    apiClient('/api/v1/admin/stats'),

  getUsers: ({ search = '', role = '', page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    params.append('page', page);
    params.append('limit', limit);
    return apiClient(`/api/v1/admin/users?${params.toString()}`);
  },

  updateUserRole: (userId, role) =>
    apiClient(`/api/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      body: { role },
    }),

  updateUserStatus: (userId, isActive) =>
    apiClient(`/api/v1/admin/users/${userId}/status`, {
      method: 'PUT',
      body: { is_active: isActive },
    }),

  getRoleRequests: ({ status = 'pending', page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    params.append('page', page);
    params.append('limit', limit);
    return apiClient(`/api/v1/admin/role-requests?${params.toString()}`);
  },

  handleRoleRequest: (reqId, status, adminNotes = '') =>
    apiClient(`/api/v1/admin/role-requests/${reqId}/action`, {
      method: 'POST',
      body: {
        status,
        admin_notes: adminNotes,
      },
    }),

  getAuditLogs: ({ action = '', outcome = '', actorEmail = '', resourceType = '', page = 1, limit = 25 } = {}) => {
    const params = new URLSearchParams();
    if (action) params.append('action', action);
    if (outcome) params.append('outcome', outcome);
    if (actorEmail) params.append('actor_email', actorEmail);
    if (resourceType) params.append('resource_type', resourceType);
    params.append('page', page);
    params.append('limit', limit);
    return apiClient(`/api/v1/admin/audit-logs?${params.toString()}`);
  },
};
