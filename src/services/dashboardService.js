import { apiClient } from './apiClient';

export const dashboardService = {
  summary: () => apiClient.get('/dashboard/summary').then((res) => res.data.data),

  charts: () => apiClient.get('/dashboard/charts').then((res) => res.data.data),

  groups: () => apiClient.get('/dashboard/groups').then((res) => res.data.data),

  insuranceProcessingSummary: () =>
    apiClient.get('/dashboard/insurance-processing-summary').then((res) => res.data.data),
};
