import { apiClient } from './apiClient';

export const reportService = {
  weekly: (params) => apiClient.get('/reports/weekly', { params }).then((res) => res.data.data),

  monthly: (params) => apiClient.get('/reports/monthly', { params }).then((res) => res.data.data),

  yearly: (params) => apiClient.get('/reports/yearly', { params }).then((res) => res.data.data),
};
