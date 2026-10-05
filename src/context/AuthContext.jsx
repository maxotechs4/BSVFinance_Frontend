import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { registerUnauthorizedHandler } from '../services/apiClient';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../utils/constants';

export const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : null;

    // Viewer role removed: wipe any leftover viewer session.
    if (stored?.role === 'VIEWER') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [initializing, setInitializing] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // Any 401 from the API (expired/invalid token) drops the user back to the login page.
    registerUnauthorizedHandler(logout);
  }, [logout]);

  // Persists a fresh session (token + user info) returned by either /auth/login
  // or /auth/change-username, and updates in-memory state so the UI reflects
  // it immediately without requiring the user to log in again.
  const applySession = useCallback((data) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    const userInfo = { username: data.username, fullName: data.fullName, role: data.role };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
    setToken(data.token);
    setUser(userInfo);
    return userInfo;
  }, []);

  const login = useCallback(async (username, password) => {
  setInitializing(true);
  try {
    const data = await authService.login(username, password);

    // The Viewer role has been removed. Even if the server still accepts
    // these credentials, never start a session — show the normal error.
    if (data?.role === 'VIEWER') {
      throw new Error('Invalid username or password');
    }

    return applySession(data);
  } finally {
    setInitializing(false);
  }
}, [applySession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      initializing,
      login,
      logout,
      applySession,
    }),
    [user, token, initializing, login, logout, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
