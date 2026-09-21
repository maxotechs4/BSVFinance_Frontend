import { useContext } from 'react';
import { ThemeModeContext } from '../context/ThemeModeContext';

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return ctx;
}
