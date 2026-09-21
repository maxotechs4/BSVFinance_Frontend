import { apiClient } from './apiClient';

export const capitalService = {
  getAccount: () => apiClient.get('/capital').then((res) => res.data.data),

  setCapitalAmount: (capitalAmount) =>
    apiClient.put('/capital', { capitalAmount }).then((res) => res.data.data),

  listTransactions: () =>
    apiClient.get('/capital/transactions').then((res) => res.data.data),

  createTransaction: (payload) =>
    apiClient.post('/capital/transactions', payload).then((res) => res.data.data),

  updateTransaction: (id, payload) =>
    apiClient.put(`/capital/transactions/${id}`, payload).then((res) => res.data.data),

  removeTransaction: (id) =>
    apiClient.delete(`/capital/transactions/${id}`).then((res) => res.data),
};
