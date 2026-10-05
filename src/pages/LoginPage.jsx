import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
// import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../services/apiClient';
import logo from '../assets/logo.webp';

// Login input styling: visible border in both themes, white highlight in dark mode
const loginFieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: (theme) => (theme.palette.mode === 'dark' ? '#6B6B6B' : 'rgba(0,0,0,0.23)'),
    },
    '&:hover fieldset': {
      borderColor: (theme) => (theme.palette.mode === 'dark' ? '#BDBDBD' : '#060606'),
    },
    '&.Mui-focused fieldset': {
      borderColor: (theme) => (theme.palette.mode === 'dark' ? '#FFFFFF' : '#060606'),
      borderWidth: 2,
    },
    '&.Mui-error fieldset': {
      borderColor: (theme) => theme.palette.error.main,
    },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: (theme) => (theme.palette.mode === 'dark' ? '#FFFFFF' : '#060606'),
  },
  '& .MuiInputLabel-root.Mui-error': {
    color: (theme) => theme.palette.error.main,
  },
  '& .MuiInputBase-input': {
    caretColor: (theme) => (theme.palette.mode === 'dark' ? '#FFFFFF' : '#060606'),
  },
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { username: '', password: '' } });

  const onSubmit = async (values) => {
    setServerError('');
    setSubmitting(true);
    try {
      await login(values.username, values.password);
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper elevation={0} sx={{ p: 4, width: 400, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <Box
            component="img"
            src={logo}
            alt="BSV Finance logo"
            sx={{ width: 64, height: 64, objectFit: 'contain', mb: 1.5 }}
          />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            BSV Finance
          </Typography>
        </Box>

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            fullWidth
            label="Username"
            margin="normal"
            autoFocus
            sx={loginFieldSx}
            error={Boolean(errors.username)}
            helperText={errors.username?.message}
            {...register('username', { required: 'Username is required' })}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            margin="normal"
            sx={loginFieldSx}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end" tabIndex={-1}>
                      {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            {...register('password', { required: 'Password is required' })}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ mt: 3, py: 1.2 }}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
