import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, CircularProgress, InputAdornment, Box,
} from '@mui/material';
import { todayIso } from '../../utils/formatters';

const PHONE_PATTERN = /^[6-9]\d{9}$/;

const emptyValues = {
  memberCode: '', name: '', place: '', phoneNumber: '', alternatePhoneNumber: '',
  monthlyAmount: 1180, joinDate: todayIso(),
};

/**
 * Create/edit form for the Monthly Savings scheme. Deliberately minimal —
 * just the 6 fields the scheme actually needs, unlike the full Member form.
 */
export default function SavingsMemberFormDialog({ open, member, submitting, onSubmit, onClose }) {
  const isEdit = Boolean(member);

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm({ defaultValues: emptyValues });

  useEffect(() => {
    if (open) {
      reset(member ? {
        memberCode: member.memberCode || '',
        name: member.name || '',
        place: member.place || '',
        phoneNumber: member.phoneNumber || '',
        alternatePhoneNumber: member.alternatePhoneNumber || '',
        monthlyAmount: member.monthlyAmount ?? 1180,
        joinDate: member.joinDate || todayIso(),
      } : emptyValues);
    }
  }, [open, member, reset]);

  const submitHandler = (values) => {
    onSubmit({
      memberCode: values.memberCode,
      name: values.name,
      place: values.place,
      phoneNumber: values.phoneNumber,
      alternatePhoneNumber: values.alternatePhoneNumber || null,
      monthlyAmount: Number(values.monthlyAmount),
      joinDate: values.joinDate,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? `Edit savings member — ${member?.name}` : 'Create savings member'}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(submitHandler)} noValidate>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Member ID *" error={Boolean(errors.memberCode)}
                helperText={errors.memberCode?.message || (isEdit ? 'Cannot be changed after creation' : 'e.g. SAV0001')}
                disabled={isEdit}
                {...register('memberCode', {
                  required: 'Member ID is required',
                  maxLength: { value: 20, message: 'Max 20 chars' },
                  pattern: { value: /^[A-Za-z0-9_-]+$/, message: 'Letters, numbers, hyphens, underscores only' },
                })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Name *" error={Boolean(errors.name)}
                helperText={errors.name?.message}
                {...register('name', { required: 'Name is required', maxLength: { value: 100, message: 'Max 100 chars' } })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Place"
                {...register('place')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Phone Number *" error={Boolean(errors.phoneNumber)}
                helperText={errors.phoneNumber?.message}
                {...register('phoneNumber', {
                  required: 'Phone number is required',
                  pattern: { value: PHONE_PATTERN, message: 'Enter valid 10-digit number' },
                })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Alternate Phone Number" error={Boolean(errors.alternatePhoneNumber)}
                helperText={errors.alternatePhoneNumber?.message || 'Optional'}
                {...register('alternatePhoneNumber', {
                  validate: (v) => !v || PHONE_PATTERN.test(v) || 'Enter valid 10-digit number',
                })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type="number" label="Amount (per month) *"
                error={Boolean(errors.monthlyAmount)}
                helperText={errors.monthlyAmount?.message || '36-month plan'}
                slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
                {...register('monthlyAmount', {
                  required: 'Amount is required',
                  validate: (v) => Number(v) > 0 || 'Must be greater than zero',
                })} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth type="date" label="Join Date *"
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.joinDate)} helperText={errors.joinDate?.message}
                {...register('joinDate', { required: 'Join date is required' })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
            {isEdit ? 'Save changes' : 'Save'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
