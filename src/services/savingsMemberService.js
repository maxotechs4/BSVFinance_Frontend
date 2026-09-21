import { apiClient } from './apiClient';

export const savingsMemberService = {
  list: (params) => apiClient.get('/savings-members', { params }).then((res) => res.data.data),

  getById: (id) => apiClient.get(`/savings-members/${id}`).then((res) => res.data.data),

  create: (payload) => apiClient.post('/savings-members', payload).then((res) => res.data.data),

  update: (id, payload) => apiClient.put(`/savings-members/${id}`, payload).then((res) => res.data.data),

  remove: (id) => apiClient.delete(`/savings-members/${id}`).then((res) => res.data),
};
