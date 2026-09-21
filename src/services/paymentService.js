import { apiClient } from './apiClient';

export const paymentService = {
  list: (params) => apiClient.get('/payments', { params }).then((res) => res.data.data),

  getById: (id) => apiClient.get(`/payments/${id}`).then((res) => res.data.data),

  getByMember: (memberId) =>
    apiClient.get(`/payments/member/${memberId}`).then((res) => res.data.data),

  create: (payload) => apiClient.post('/payments', payload).then((res) => res.data.data),

  // Collection page: server auto-derives the member's next week from their payment
  // history (last week + 1) and updates that week's entry instead of duplicating it.
  collect: (payload) => apiClient.post('/payments/collect', payload).then((res) => res.data.data),

  update: (id, payload) => apiClient.put(`/payments/${id}`, payload).then((res) => res.data.data),

  remove: (id) => apiClient.delete(`/payments/${id}`).then((res) => res.data),
};