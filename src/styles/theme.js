import { createTheme } from '@mui/material/styles';

/**
 * Design language: a "ledger book" aesthetic for a microfinance collection app -
 * deep teal as the trust/primary color, warm amber as the currency/accent color,
 * tabular monospace figures for money so columns of rupee amounts line up cleanly.
 */
const palette = {
  teal900: '#15433D',
  teal700: '#1F584F',
  teal300: '#9FCBBE',
  amber: '#C98A3D',
  amberDark: '#854F0B',
  green: '#3C8C5E',
  red: '#B4453A',
};

export function buildTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: palette.teal900, light: palette.teal700, contrastText: '#FFFFFF' },
      secondary: { main: palette.amber, contrastText: '#FFFFFF' },
      success: { main: palette.green },
      error: { main: palette.red },
      background: {
        default: isDark ? '#0F1714' : '#EFF3F1',
        paper: isDark ? '#16201D' : '#FFFFFF',
      },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: "'IBM Plex Sans', 'Roboto', 'Helvetica', 'Arial', sans-serif",
      h1: { fontFamily: "'Source Serif 4', serif" },
      h2: { fontFamily: "'Source Serif 4', serif" },
      h3: { fontFamily: "'Source Serif 4', serif" },
      h4: { fontFamily: "'Source Serif 4', serif", fontWeight: 600 },
      h5: { fontFamily: "'Source Serif 4', serif", fontWeight: 600 },
      h6: { fontFamily: "'Source Serif 4', serif", fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600, whiteSpace: 'nowrap' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },
    },
  });
}

export const moneyFontFamily = "'IBM Plex Mono', 'Roboto Mono', monospace";
export const brandColors = palette;
