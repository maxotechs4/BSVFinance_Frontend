import { AppBar, Toolbar, IconButton, Typography, Box, Tooltip, Chip } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../hooks/useAuth';

export default function Topbar({ open, onToggle, title }) {
  const { mode, toggleMode } = useThemeMode();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      className="no-print"
      sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <Tooltip title={open ? 'Close sidebar' : 'Open sidebar'}>
          <IconButton onClick={onToggle} edge="start" aria-label={open ? 'Close sidebar' : 'Open sidebar'}>
            {open ? <MenuOpenRoundedIcon /> : <MenuRoundedIcon />}
          </IconButton>
        </Tooltip>

        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 18 }}>
          {title}
        </Typography>

        {isViewer && (
          <Tooltip title="This account can view every page but cannot create, edit, or delete anything">
            <Chip
              icon={<VisibilityRoundedIcon fontSize="small" />}
              label="View Only Mode"
              size="small"
              color="info"
              variant="outlined"
            />
          </Tooltip>
        )}

        <Box>
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleMode} aria-label="Toggle dark mode">
              {mode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
