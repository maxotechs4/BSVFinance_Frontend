import { createTheme } from '@mui/material/styles';

/**
 * Brand palette taken from the BSV logo + sidebar:
 * black (primary), red (active / highlight), yellow (accent).
 * Key names (teal900 / teal700 / amber) are kept so existing imports
 * such as DashboardCharts.jsx keep working.
 */
const palette = {
  teal900: '#060606',   // logo black
  teal700: '#E31E24',   // logo red
  teal300: '#E8D019',   // logo yellow
  amber: '#E8D019',     // logo yellow (accent)
  amberDark: '#8A7A00', // darker yellow, readable as text on white
  green: '#3C8C5E',
  red: '#B4453A',
};

export function buildTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: palette.teal900, light: palette.teal700, contrastText: '#FFFFFF' },
      secondary: {
        main: palette.amber,
        dark: palette.amberDark,
        contrastText: '#060606',
      },
      success: { main: palette.green },
      error: { main: palette.red },
      background: {
        default: isDark ? '#0C0C0C' : '#F5F4F1',
        paper: isDark ? '#171717' : '#FFFFFF',
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