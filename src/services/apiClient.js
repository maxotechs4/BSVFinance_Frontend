import axios from 'axios';
import { API_BASE_URL, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../utils/constants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function isViewOnlyUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    const user = raw ? JSON.parse(raw) : null;
    return user?.role === 'VIEWER';
  } catch {
    return false;
  }
}

class ViewOnlyError extends Error {
  constructor() {
    super('Your account has view-only access. Editing is disabled.');
    this.name = 'ViewOnlyError';
  }
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Belt-and-braces client-side guard for view-only accounts: the backend
  // (SecurityConfig) rejects every mutating request for this role too, so
  // this just fails fast without a round-trip and gives a clear message.
  // /auth/** (logout, change-password) is exempt — every role needs those.
  const method = (config.method || 'get').toLowerCase();
  const isAuthEndpoint = (config.url || '').includes('/auth/');
  if (WRITE_METHODS.has(method) && !isAuthEndpoint && isViewOnlyUser()) {
    return Promise.reject(new ViewOnlyError());
  }

  return config;
});


let onUnauthorized = () => {};
export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error) {
  if (error.response?.data?.errors?.length) {
    return error.response.data.errors.join(', ');
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
