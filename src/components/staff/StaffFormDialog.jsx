import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, Button, CircularProgress, Typography, Divider,
} from '@mui/material';

const emptyValues = {
  name: '', phoneNumber: '', alternatePhoneNumber: '', place: '',
  reference1Name: '', reference1PhoneNumber: '',
  reference2Name: '', reference2PhoneNumber: '',
};

const PHONE_PATTERN = /^[6-9]\d{9}$/;

export default function StaffFormDialog({ open, staff, submitting, onSubmit, onClose }) {
  const isEdit = Boolean(staff);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(staff ? {
      name: staff.name || '',
      phoneNumber: staff.phoneNumber || '',
      alternatePhoneNumber: staff.alternatePhoneNumber || '',
      place: staff.place || '',
      reference1Name: staff.reference1Name || '',
      reference1PhoneNumber: staff.reference1PhoneNumber || '',
      reference2Name: staff.reference2Name || '',
      reference2PhoneNumber: staff.reference2PhoneNumber || '',
    } : emptyValues);
  }, [open, staff, reset]);

  const submitHandler = (values) => onSubmit(values);

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(submitHandler)} noValidate>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth label="Staff Name *" error={Boolean(errors.name)}
                helperText={errors.name?.message}
                {...register('name', { required: 'Staff name is required', maxLength: { value: 100, message: 'Max 100 chars' } })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Phone Number *" error={Boolean(errors.phoneNumber)}
                helperText={errors.phoneNumber?.message}
                {...register('phoneNumber', {
                  required: 'Phone number is required',
                  pattern: { value: PHONE_PATTERN, message: 'Enter valid 10-digit number' },
                })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Alternate Phone Number" error={Boolean(errors.alternatePhoneNumber)}
                helperText={errors.alternatePhoneNumber?.message}
                {...register('alternatePhoneNumber', {
                  pattern: { value: PHONE_PATTERN, message: 'Enter valid 10-digit number' },
                })}
              />
            </Grid>

            <Grid size={12}>
              <TextField fullWidth label="Place" {...register('place', { maxLength: { value: 100, message: 'Max 100 chars' } })} />
            </Grid>

            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary">Reference 1</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Reference 1 Name" {...register('reference1Name', { maxLength: { value: 100, message: 'Max 100 chars' } })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Reference 1 Phone Number" error={Boolean(errors.reference1PhoneNumber)}
                helperText={errors.reference1PhoneNumber?.message}
                {...register('reference1PhoneNumber', {
                  pattern: { value: PHONE_PATTERN, message: 'Enter valid 10-digit number' },
                })}
              />
            </Grid>

            <Grid size={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary">Reference 2</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Reference 2 Name" {...register('reference2Name', { maxLength: { value: 100, message: 'Max 100 chars' } })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Reference 2 Phone Number" error={Boolean(errors.reference2PhoneNumber)}
                helperText={errors.reference2PhoneNumber?.message}
                {...register('reference2PhoneNumber', {
                  pattern: { value: PHONE_PATTERN, message: 'Enter valid 10-digit number' },
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            {isEdit ? 'Save changes' : 'Add Staff'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}