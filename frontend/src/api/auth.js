import { apiClient } from './client';

export const authApi = {
  login: (credentials) =>
    apiClient('/api/v1/auth/login', {
      method: 'POST',
      body: credentials,
    }),

  register: (userData) =>
    apiClient('/api/v1/auth/register', {
      method: 'POST',
      body: userData,
    }),

  logout: () =>
    apiClient('/api/v1/auth/logout', {
      method: 'POST',
    }),

  getMe: (options = {}) =>
    apiClient('/api/v1/auth/me', {
      method: 'GET',
      ...options,
    }),

  requestOwnerRole: (reason) =>
    apiClient('/api/v1/auth/request-owner-role', {
      method: 'POST',
      body: { reason },
    }),
};
