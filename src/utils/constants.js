// export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://54.90.153.228:8080/api';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const TOKEN_STORAGE_KEY = 'mfms_token';
export const USER_STORAGE_KEY = 'mfms_user';
export const THEME_STORAGE_KEY = 'mfms_theme_mode';

export const PAYMENT_METHODS = ['CASH', 'ONLINE'];

// console.log("API_BASE_URL =", API_BASE_URL);

export const COLLECTION_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CASH', label: 'Cash' },
  { value: 'ONLINE', label: 'Online' },
];

export const WEEKDAY_OPTIONS = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];
