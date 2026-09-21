import { NavLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  Avatar,
  Divider,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/logo.webp';

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

const NAV_ITEMS = [
  { label: 'Dashboard', icon: DashboardRoundedIcon, path: '/dashboard' },
  { label: 'Collection', icon: PaidRoundedIcon, path: '/collection' },
  { label: 'Monthly Savings', icon: AccountBalanceWalletRoundedIcon, path: '/savings' },
  { label: 'Demand', icon: AssessmentRoundedIcon, path: '/reports' },
];

const ADMIN_NAV_ITEM = { label: 'Admin', icon: AdminPanelSettingsRoundedIcon, path: '/admin' };
const STAFF_NAV_ITEM = { label: 'Staff', icon: BadgeRoundedIcon, path: '/staff' };
const SETTINGS_NAV_ITEM = { label: 'Settings', icon: SettingsRoundedIcon, path: '/settings' };

// variant: 'permanent' (desktop — collapsible icon rail) or 'temporary' (mobile — full overlay, closes after navigating)
export default function Sidebar({ open, variant = 'permanent', onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isTemporary = variant === 'temporary';
  // On mobile the drawer is either fully open (overlay) or not rendered at all —
  // there's no icon-only collapsed state, that's a desktop-only affordance.
  const showLabels = isTemporary ? true : open;
  const width = isTemporary ? EXPANDED_WIDTH : (open ? EXPANDED_WIDTH : COLLAPSED_WIDTH);
  const navItems = user?.role === 'ADMIN' ? [...NAV_ITEMS, STAFF_NAV_ITEM, ADMIN_NAV_ITEM, SETTINGS_NAV_ITEM] : [...NAV_ITEMS, SETTINGS_NAV_ITEM];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const closeIfMobile = () => {
    if (isTemporary) onClose?.();
  };

  return (
    <Drawer
      variant={variant}
      open={isTemporary ? open : true}
      onClose={onClose}
      ModalProps={isTemporary ? { keepMounted: true } : undefined}
      className="no-print"
      sx={{
        width: isTemporary ? 0 : width,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: (theme) => theme.transitions.create('width', { duration: 220 }),
        '& .MuiDrawer-paper': {
          width,
          overflowX: 'hidden',
          transition: (theme) => theme.transitions.create('width', { duration: 220 }),
          bgcolor: 'primary.main',
          color: '#FFFFFF',
          borderRight: 'none',
        },
      }}
    >
      <Box sx={{ px: showLabels ? 2.5 : 1.5, py: 1.24, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          component="img"
          src={logo}
          alt="Anbu Foundation logo"
          sx={{ width: 43, height: 45, borderRadius: '50%', objectFit: 'contain', flexShrink: 0, overflow: 'visible' }}
        />
        {showLabels && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.1, color: '#FFFFFF' }}>
              Anbu Foundation
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      <List sx={{ flex: 1, px: 1, py: 1.5 }}>
        {navItems.map(({ label, icon: Icon, path }) => (
          <Tooltip key={path} title={showLabels ? '' : label} placement="right">
            <ListItemButton
              component={NavLink}
              to={path}
              onClick={closeIfMobile}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: 'rgba(255,255,255,0.75)',
                justifyContent: showLabels ? 'flex-start' : 'center',
                '&.active': {
                  bgcolor: 'primary.light',
                  color: '#FFFFFF',
                  borderLeft: (theme) => `3px solid ${theme.palette.secondary.main}`,
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: showLabels ? 36 : 'auto', color: 'inherit' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {showLabels && (
  <ListItemText
    primary={label}
    slotProps={{ primary: { sx: { fontSize: 14 } } }}
  />
)}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      <Box sx={{ p: 1.5 }}>
        <Tooltip title={showLabels ? '' : 'Logout'} placement="right">
          <ListItemButton
            onClick={() => { closeIfMobile(); handleLogout(); }}
            sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.75)', justifyContent: showLabels ? 'flex-start' : 'center' }}
          >
            <ListItemIcon sx={{ minWidth: showLabels ? 36 : 'auto', color: 'inherit' }}>
              <LogoutRoundedIcon fontSize="small" />
            </ListItemIcon>
            {showLabels &&(<ListItemText
  primary="Logout"
  slotProps={{ primary: { sx: { fontSize: 14 } } }}
/>) }
          </ListItemButton>
        </Tooltip>
        {showLabels && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, px: 1 }}>
            <Avatar sx={{ width: 26, height: 26, fontSize: 12, bgcolor: 'rgba(255,255,255,0.15)' }}>
              {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="caption" noWrap sx={{ display: 'block', color: '#FFFFFF' }}>
                {user?.fullName || user?.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {user?.role}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

export { EXPANDED_WIDTH, COLLAPSED_WIDTH };