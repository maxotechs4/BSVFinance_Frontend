import { apiClient } from './apiClient';

export const savingsPaymentService = {
  getByMember: (savingsMemberId) =>
    apiClient.get(`/savings-payments/member/${savingsMemberId}`).then((res) => res.data.data),

  create: (payload) => apiClient.post('/savings-payments', payload).then((res) => res.data.data),

  update: (id, payload) => apiClient.put(`/savings-payments/${id}`, payload).then((res) => res.data.data),

  remove: (id) => apiClient.delete(`/savings-payments/${id}`).then((res) => res.data),
};
