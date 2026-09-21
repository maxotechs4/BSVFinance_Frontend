import { apiClient } from './apiClient';

export const authService = {
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }).then((res) => res.data.data),

  logout: () => apiClient.post('/auth/logout').then((res) => res.data),

  changePassword: (currentPassword, newPassword) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }).then((res) => res.data),

  changeUsername: (currentPassword, newUsername) =>
    apiClient.post('/auth/change-username', { currentPassword, newUsername }).then((res) => res.data.data),
};
