import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, CircularProgress, InputAdornment,
  Box, ToggleButtonGroup, ToggleButton, Typography, Alert,
} from '@mui/material';
import { formatCurrency, todayIso } from '../../utils/formatters';

function nextInstallmentNumber(member) {
  return Math.min((member?.installmentsPaid ?? 0) + 1, member?.totalMonths ?? 36);
}

function buildDefaults(member, payment) {
  if (payment) {
    return {
      installmentNumber: payment.installmentNumber,
      amountPaid: payment.amountPaid,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      upiTransactionId: payment.upiTransactionId || '',
      remarks: payment.remarks || '',
    };
  }
  return {
    installmentNumber: nextInstallmentNumber(member),
    amountPaid: member?.monthlyAmount ?? '',
    paymentDate: todayIso(),
    paymentMethod: 'CASH',
    upiTransactionId: '',
    remarks: '',
  };
}

export default function SavingsPaymentFormDialog({ open, member, payment, submitting, onSubmit, onClose }) {
  const isEdit = Boolean(payment);

  const {
    register, handleSubmit, reset, control, watch,
    formState: { errors },
  } = useForm({ defaultValues: buildDefaults(member, payment) });

  useEffect(() => {
    if (open) {
      reset(buildDefaults(member, payment));
    }
  }, [open, member, payment, reset]);

  const paymentMethod = watch('paymentMethod');
  const amountPaid = watch('amountPaid');

  const submitHandler = (values) => {
    onSubmit({
      savingsMemberId: member.id,
      installmentNumber: Number(values.installmentNumber),
      amountPaid: Number(values.amountPaid),
      paymentDate: values.paymentDate,
      paymentMethod: values.paymentMethod,
      upiTransactionId: values.paymentMethod === 'ONLINE' ? values.upiTransactionId : null,
      remarks: values.remarks,
    });
  };

  const monthlyAmount = Number(member?.monthlyAmount ?? 0);
  const remaining = Math.max(monthlyAmount - Number(amountPaid || 0), 0);
  const extra = Math.max(Number(amountPaid || 0) - monthlyAmount, 0);

  if (!member) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? 'Edit payment' : 'Add payment'} &mdash; {member.name}
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(submitHandler)} noValidate>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Monthly amount: <strong>{formatCurrency(monthlyAmount)}</strong> &middot; {member.installmentsPaid ?? 0} of {member.totalMonths ?? 36} installments paid
          </Alert>

          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                fullWidth type="number" label="Installment #"
                error={Boolean(errors.installmentNumber)}
                helperText={errors.installmentNumber?.message}
                {...register('installmentNumber', {
                  required: 'Required',
                  min: { value: 1, message: `1-${member.totalMonths ?? 36}` },
                  max: { value: member.totalMonths ?? 36, message: `1-${member.totalMonths ?? 36}` },
                })}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 8 }}>
              <TextField
                fullWidth type="date" label="Payment date"
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.paymentDate)}
                {...register('paymentDate', { required: 'Payment date is required' })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="amountPaid"
                control={control}
                rules={{ required: 'Amount is required', validate: (v) => Number(v) > 0 || 'Must be greater than zero' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth type="number" label="Amount paid"
                    error={Boolean(errors.amountPaid)}
                    helperText={errors.amountPaid?.message}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Remaining / credit
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {remaining > 0 ? `${formatCurrency(remaining)} remaining` : 'Fully paid'}
                  {extra > 0 ? ` · +${formatCurrency(extra)} credit` : ''}
                </Typography>
              </Box>
            </Grid>

            <Grid size={12}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    onChange={(_, value) => value && field.onChange(value)}
                  >
                    <ToggleButton value="CASH">Cash</ToggleButton>
                    <ToggleButton value="ONLINE">Online</ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Grid>

            {paymentMethod === 'ONLINE' && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="UPI transaction ID"
                  error={Boolean(errors.upiTransactionId)}
                  helperText={errors.upiTransactionId?.message}
                  {...register('upiTransactionId', {
                    required: 'UPI transaction ID is required for online payments',
                  })}
                />
              </Grid>
            )}

            <Grid size={12}>
              <TextField fullWidth label="Remarks" multiline minRows={2} {...register('remarks')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
