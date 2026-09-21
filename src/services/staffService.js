import { apiClient } from './apiClient';

// Admin-only end to end (see SecurityConfig on the backend) — every call
// here 403s for STAFF/VIEWER logins, so only call this from admin-gated UI.
export const staffService = {
  list: () => apiClient.get('/staff').then((res) => res.data.data),

  getById: (id) => apiClient.get(`/staff/${id}`).then((res) => res.data.data),

  create: (payload) => apiClient.post('/staff', payload).then((res) => res.data.data),

  update: (id, payload) => apiClient.put(`/staff/${id}`, payload).then((res) => res.data.data),

  remove: (id) => apiClient.delete(`/staff/${id}`).then((res) => res.data),
};
