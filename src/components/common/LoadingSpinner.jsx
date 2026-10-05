import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingSpinner({ label = 'Loading...', fullHeight = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 6,
        minHeight: fullHeight ? '60vh' : 'auto',
      }}
    >
      <CircularProgress
        size={36}
        thickness={4}
        sx={{
          color: (theme) => (theme.palette.mode === 'dark' ? '#FFFFFF' : '#060606'),
        }}
      />
      <Typography
        variant="body2"
        sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#FFFFFF' : 'text.secondary') }}
      >
        {label}
      </Typography>
    </Box>
  );
}