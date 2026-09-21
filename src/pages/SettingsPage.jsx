import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { useThemeMode } from '../hooks/useThemeMode';
import { authService } from '../services/authService';
import { extractErrorMessage } from '../services/apiClient';

export default function SettingsPage() {
  const { user, applySession } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [usernameInfo, setUsernameInfo] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const {
    register: registerUsername,
    handleSubmit: handleSubmitUsername,
    reset: resetUsername,
    formState: { errors: usernameErrors },
  } = useForm({ defaultValues: { currentPassword: '', newUsername: '' } });

  const onSubmit = async (values) => {
    setInfo('');
    setError('');
    setSubmitting(true);
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      setInfo('Password updated successfully.');
      reset();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitUsername = async (values) => {
    setUsernameInfo('');
    setUsernameError('');
    setUsernameSubmitting(true);
    try {
      const data = await authService.changeUsername(values.currentPassword, values.newUsername);
      applySession(data);
      setUsernameInfo('Username updated successfully.');
      resetUsername();
    } catch (err) {
      setUsernameError(extractErrorMessage(err));
    } finally {
      setUsernameSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 900, lg: 1000 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Settings</Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>{user?.fullName || user?.username}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.role}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Appearance</Typography>
            <FormControlLabel
              control={<Switch checked={mode === 'dark'} onChange={toggleMode} />}
              label="Dark mode"
            />
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 } }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Change username</Typography>
        {usernameInfo && <Alert severity="success" sx={{ mb: 2 }}>{usernameInfo}</Alert>}
        {usernameError && <Alert severity="error" sx={{ mb: 2 }}>{usernameError}</Alert>}
        <Box component="form" onSubmit={handleSubmitUsername(onSubmitUsername)} noValidate>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="New username"
                error={Boolean(usernameErrors.newUsername)}
                helperText={usernameErrors.newUsername?.message}
                {...registerUsername('newUsername', {
                  required: 'Required',
                  minLength: { value: 3, message: 'At least 3 characters' },
                  pattern: {
                    value: /^[a-zA-Z0-9._-]+$/,
                    message: 'Only letters, numbers, dots, underscores, and hyphens allowed',
                  },
                })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="password"
                label="Current password"
                error={Boolean(usernameErrors.currentPassword)}
                helperText={usernameErrors.currentPassword?.message}
                {...registerUsername('currentPassword', { required: 'Required' })}
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Button type="submit" variant="contained" disabled={usernameSubmitting}>
            {usernameSubmitting ? 'Updating...' : 'Update username'}
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Change password</Typography>
        {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                type="password"
                label="Current password"
                error={Boolean(errors.currentPassword)}
                helperText={errors.currentPassword?.message}
                {...register('currentPassword', { required: 'Required' })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="password"
                label="New password"
                error={Boolean(errors.newPassword)}
                helperText={errors.newPassword?.message}
                {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'At least 8 characters' } })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="password"
                label="Confirm new password"
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword?.message}
                {...register('confirmPassword', {
                  required: 'Required',
                  validate: (v) => v === watch('newPassword') || 'Passwords do not match',
                })}
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}