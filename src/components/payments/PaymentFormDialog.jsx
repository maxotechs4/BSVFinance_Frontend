import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  InputAdornment,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Alert,
} from '@mui/material';

import {
  formatCurrency,
  isoWeekNumber,
  isoWeekYear,
  todayIso,
} from '../../utils/formatters';


/*
 * Build the initial values for the payment form.
 *
 * IMPORTANT:
 * For a NEW payment, the week/year are calculated from
 * the actual payment date.
 *
 * We DO NOT use:
 * "last payment week + 1"
 *
 * This means:
 *
 * Example:
 * 31 Aug 2026 -> W36
 *
 * If the user records a payment on 31 Aug 2026,
 * it stays W36.
 *
 * When the payment date becomes 7 Sep 2026,
 * it becomes W37.
 */
function buildDefaults(member, payment) {
  /*
   * Editing an existing payment
   */
  if (payment) {
    return {
      weekNumber: payment.weekNumber,
      paymentYear: payment.paymentYear,
      amountPaid: payment.amountPaid,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      upiTransactionId: payment.upiTransactionId || '',
      remarks: payment.remarks || '',
    };
  }

  /*
   * New payment
   *
   * Start with today's date.
   */
  const paymentDate = todayIso();

  /*
   * Calculate the ISO week and ISO year from
   * the actual payment date.
   */
  const date = new Date(`${paymentDate}T00:00:00`);

  const weekNumber = isoWeekNumber(date);
  const paymentYear = isoWeekYear(date);

  return {
    weekNumber,
    paymentYear,
    amountPaid: member?.weeklyAmount ?? '',
    paymentDate,
    paymentMethod: 'CASH',
    upiTransactionId: '',
    remarks: '',
  };
}


export default function PaymentFormDialog({
  open,
  member,
  payment,
  payments = [],
  submitting,
  onSubmit,
  onClose,
}) {
  const isEdit = Boolean(payment);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: buildDefaults(member, payment),
  });


  /*
   * Reset the form whenever the dialog is opened
   * or the selected payment/member changes.
   */
  useEffect(() => {
    if (open) {
      reset(buildDefaults(member, payment));
    }
  }, [
    open,
    member,
    payment,
    reset,
  ]);


  const paymentMethod = watch('paymentMethod');
  const amountPaid = watch('amountPaid');


  /*
   * When the payment date changes, automatically
   * calculate the correct ISO week and year.
   *
   * Example:
   *
   * 31 Aug 2026 -> Week 36 / 2026
   * 7 Sep 2026  -> Week 37 / 2026
   */
  const handlePaymentDateChange = (event) => {
    const selectedDate = event.target.value;

    /*
     * First allow react-hook-form to receive
     * the selected date.
     */
    setValue('paymentDate', selectedDate);

    if (!selectedDate) {
      return;
    }

    /*
     * Convert yyyy-MM-dd into a local date.
     *
     * Adding T00:00:00 prevents the date from
     * shifting because of timezone conversion.
     */
    const date = new Date(`${selectedDate}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return;
    }

    /*
     * Calculate the week from the selected date.
     */
    const selectedWeek = isoWeekNumber(date);
    const selectedYear = isoWeekYear(date);

    /*
     * Automatically update the Week # and Year fields.
     */
    setValue('weekNumber', selectedWeek);
    setValue('paymentYear', selectedYear);
  };


  /*
   * Submit the payment.
   */
  const submitHandler = (values) => {
    onSubmit({
      memberId: member.id,

      /*
       * Week and year are now calculated from
       * the payment date.
       */
      weekNumber: Number(values.weekNumber),
      paymentYear: Number(values.paymentYear),

      amountPaid: Number(values.amountPaid),

      paymentDate: values.paymentDate,

      paymentMethod: values.paymentMethod,

      upiTransactionId:
        values.paymentMethod === 'ONLINE'
          ? values.upiTransactionId
          : null,

      remarks: values.remarks,
    });
  };


  /*
   * Calculate remaining amount / credit.
   */
  const weeklyAmount = Number(
    member?.weeklyAmount ?? 0
  );

  const remaining = Math.max(
    weeklyAmount - Number(amountPaid || 0),
    0
  );

  const extra = Math.max(
    Number(amountPaid || 0) - weeklyAmount,
    0
  );


  if (!member) {
    return null;
  }


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {isEdit
          ? 'Edit payment'
          : 'Add payment'}
        {' — '}
        {member.name}
      </DialogTitle>


      <Box
        component="form"
        onSubmit={handleSubmit(submitHandler)}
        noValidate
      >
        <DialogContent dividers>

          {/* Weekly fixed amount */}
          <Alert
            severity="info"
            sx={{ mb: 2 }}
          >
            Weekly fixed amount:{' '}
            <strong>
              {formatCurrency(weeklyAmount)}
            </strong>
          </Alert>


          <Grid
            container
            spacing={2}
          >

            {/* =========================
                WEEK NUMBER
            ========================== */}
            <Grid
              size={{
                xs: 6,
                sm: 3,
              }}
            >
              <TextField
                fullWidth
                type="number"
                label="Week #"
                error={Boolean(
                  errors.weekNumber
                )}
                helperText={
                  !errors.weekNumber
                    ? 'Automatically calculated from payment date'
                    : undefined
                }
                InputProps={{
                  readOnly: true,
                }}
                {...register(
                  'weekNumber',
                  {
                    required: true,
                    min: 1,
                    max: 53,
                  }
                )}
              />
            </Grid>


            {/* =========================
                YEAR
            ========================== */}
            <Grid
              size={{
                xs: 6,
                sm: 3,
              }}
            >
              <TextField
                fullWidth
                type="number"
                label="Year"
                error={Boolean(
                  errors.paymentYear
                )}
                helperText={
                  !errors.paymentYear
                    ? 'Automatically calculated from payment date'
                    : undefined
                }
                InputProps={{
                  readOnly: true,
                }}
                {...register(
                  'paymentYear',
                  {
                    required: true,
                    min: 2000,
                  }
                )}
              />
            </Grid>


            {/* =========================
                PAYMENT DATE
            ========================== */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <TextField
                fullWidth
                type="date"
                label="Payment date"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                error={Boolean(
                  errors.paymentDate
                )}
                {...register(
                  'paymentDate',
                  {
                    required:
                      'Payment date is required',

                    /*
                     * When the date changes,
                     * automatically update Week #
                     * and Year.
                     */
                    onChange:
                      handlePaymentDateChange,
                  }
                )}
              />
            </Grid>


            {/* =========================
                AMOUNT PAID
            ========================== */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <Controller
                name="amountPaid"
                control={control}
                rules={{
                  required:
                    'Amount is required',

                  validate: (value) =>
                    Number(value) > 0 ||
                    'Must be greater than zero',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Amount paid"
                    error={Boolean(
                      errors.amountPaid
                    )}
                    helperText={
                      errors.amountPaid?.message
                    }
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            ₹
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>


            {/* =========================
                REMAINING / CREDIT
            ========================== */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  pt: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Remaining / credit
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                  }}
                >
                  {remaining > 0
                    ? `${formatCurrency(
                        remaining
                      )} remaining`
                    : 'Fully paid'}

                  {extra > 0
                    ? ` · +${formatCurrency(
                        extra
                      )} credit`
                    : ''}
                </Typography>
              </Box>
            </Grid>


            {/* =========================
                PAYMENT METHOD
            ========================== */}
            <Grid size={12}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    onChange={(
                      _,
                      value
                    ) => {
                      if (value) {
                        field.onChange(value);
                      }
                    }}
                  >
                    <ToggleButton value="CASH">
                      Cash
                    </ToggleButton>

                    <ToggleButton value="ONLINE">
                      Online
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}
              />
            </Grid>


            {/* =========================
                UPI TRANSACTION ID
            ========================== */}
            {paymentMethod === 'ONLINE' && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="UPI transaction ID"
                  error={Boolean(
                    errors.upiTransactionId
                  )}
                  helperText={
                    errors.upiTransactionId
                      ?.message
                  }
                  {...register(
                    'upiTransactionId',
                    {
                      required:
                        'UPI transaction ID is required for online payments',
                    }
                  )}
                />
              </Grid>
            )}


            {/* =========================
                REMARKS
            ========================== */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                minRows={2}
                {...register('remarks')}
              />
            </Grid>

          </Grid>
        </DialogContent>


        {/* =========================
            BUTTONS
        ========================== */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
          }}
        >
          <Button
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={
              submitting ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                />
              ) : null
            }
          >
            Save
          </Button>
        </DialogActions>

      </Box>
    </Dialog>
  );
}