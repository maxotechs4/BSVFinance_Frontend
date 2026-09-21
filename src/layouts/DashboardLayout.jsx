import { useState } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { EXPANDED_WIDTH, COLLAPSED_WIDTH } from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/collection': 'Collection',
  '/reports': 'Demand',
  '/settings': 'Settings',
};

export default function DashboardLayout() {
  // md breakpoint (900px) and up = desktop layout with a collapsible permanent rail.
  // Below that = mobile/tablet layout with a full-overlay drawer, closed by default.
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'));
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] || 'Microfinance Management System';
  const sidebarOpen = isDesktop ? desktopOpen : mobileOpen;

  const handleToggle = () => {
    if (isDesktop) {
      setDesktopOpen((prev) => !prev);
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

    return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      <Sidebar
        open={sidebarOpen}
        variant={isDesktop ? 'permanent' : 'temporary'}
        onClose={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          transition: (theme) => theme.transitions.create('margin', { duration: 220 }),
        }}
      >
        <Topbar open={sidebarOpen} onToggle={handleToggle} title={title} />
        <Box
          sx={{
            p: { xs: 1.5, sm: 2, md: 3 },
            // On very large / TV-sized screens, cap content width and center it
            // instead of letting cards stretch edge-to-edge.
            maxWidth: 1600,
            mx: 'auto',
            width: '100%',
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export { EXPANDED_WIDTH, COLLAPSED_WIDTH };