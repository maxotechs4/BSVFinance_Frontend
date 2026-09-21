import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, CircularProgress, InputAdornment, Typography, Box,
} from '@mui/material';

/**
 * Admin-only dialog for setting a member's one-time insurance and
 * processing charges. Kept separate from MemberFormDialog since this is
 * only ever opened from the Admin page.
 */
export default function MemberChargesDialog({ open, member, submitting, onSubmit, onClose }) {
  const {
    control, handleSubmit, reset,
    formState: { errors },
  } = useForm({ defaultValues: { insuranceAmount: '', processingAmount: '' } });

  useEffect(() => {
    if (open && member) {
      reset({
        insuranceAmount: member.insuranceAmount ?? 0,
        processingAmount: member.processingAmount ?? 0,
      });
    }
  }, [open, member, reset]);

  const submitHandler = (values) => {
    onSubmit({
      insuranceAmount: Number(values.insuranceAmount),
      processingAmount: Number(values.processingAmount),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>Add / Edit Charges</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(submitHandler)} noValidate>
        <DialogContent>
          {member && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {member.name} ({member.memberCode})
            </Typography>
          )}
          <Grid container spacing={2}>
            <Grid size={12}>
              <Controller
                name="insuranceAmount"
                control={control}
                rules={{
                  required: 'Insurance amount is required',
                  validate: (v) => Number(v) >= 0 || 'Cannot be negative',
                }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="number" label="Insurance Amount *"
                    error={Boolean(errors.insuranceAmount)}
                    helperText={errors.insuranceAmount?.message}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="processingAmount"
                control={control}
                rules={{
                  required: 'Processing amount is required',
                  validate: (v) => Number(v) >= 0 || 'Cannot be negative',
                }}
                render={({ field }) => (
                  <TextField {...field} fullWidth type="number" label="Processing Amount *"
                    error={Boolean(errors.processingAmount)}
                    helperText={errors.processingAmount?.message}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
