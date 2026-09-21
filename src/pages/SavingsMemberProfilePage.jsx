import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Tooltip, Alert, Button,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddCardRoundedIcon from '@mui/icons-material/AddCardRounded';
import { savingsMemberService } from '../services/savingsMemberService';
import { savingsPaymentService } from '../services/savingsPaymentService';
import { extractErrorMessage } from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../utils/formatters';
import { moneyFontFamily } from '../styles/theme';
import StatusChip from '../components/common/StatusChip';
import PaymentMethodBadge from '../components/common/PaymentMethodBadge';
import SavingsPaymentFormDialog from '../components/savings/SavingsPaymentFormDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

export default function SavingsMemberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [paymentDialog, setPaymentDialog] = useState({ open: false, payment: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [memberData, paymentsData] = await Promise.all([
        savingsMemberService.getById(id),
        savingsPaymentService.getByMember(id),
      ]);
      setMember(memberData);
      setPayments(paymentsData);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSavePayment = async (payload) => {
    setSubmitting(true);
    try {
      if (paymentDialog.payment) {
        await savingsPaymentService.update(paymentDialog.payment.id, payload);
        showSuccess('Payment updated');
      } else {
        await savingsPaymentService.create(payload);
        showSuccess('Payment recorded');
      }
      setPaymentDialog({ open: false, payment: null });
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async () => {
    setSubmitting(true);
    try {
      await savingsPaymentService.remove(deleteTarget.id);
      showSuccess('Payment deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading savings member profile..." fullHeight />;
  if (error) return <Box><Alert severity="error">{error}</Alert></Box>;
  if (!member) return null;

  const dueHistory = payments.filter((p) => Number(p.remainingAmount) > 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/savings')}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{member.name}</Typography>
        <Chip label={member.memberCode} size="small" sx={{ fontFamily: moneyFontFamily }} />
        <Chip label={member.status} size="small" color={member.status === 'ACTIVE' ? 'success' : 'default'} />
        {member.place && <Chip label={member.place} size="small" variant="outlined" />}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddCardRoundedIcon />}
          onClick={() => setPaymentDialog({ open: true, payment: null })}>
          Add payment
        </Button>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Monthly Amount</Typography>
            <Typography variant="h6" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(member.monthlyAmount)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Total Paid</Typography>
            <Typography variant="h6" sx={{ fontFamily: moneyFontFamily, color: 'success.main' }}>{formatCurrency(member.totalPaid)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Total Balance</Typography>
            <Typography variant="h6" sx={{ fontFamily: moneyFontFamily, color: Number(member.totalBalance) > 0 ? 'error.main' : 'success.main' }}>
              {formatCurrency(member.totalBalance)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Installments Paid</Typography>
            <Typography variant="h6">{member.installmentsPaid} / {member.totalMonths}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {dueHistory.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {dueHistory.length} installment{dueHistory.length > 1 ? 's' : ''} with outstanding balance —
          total {formatCurrency(dueHistory.reduce((s, p) => s + Number(p.remainingAmount), 0))}
        </Alert>
      )}

      {/* Member details */}
      <Paper variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <DetailItem label="Phone Number" value={member.phoneNumber} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <DetailItem label="Alternate Phone Number" value={member.alternatePhoneNumber || '-'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <DetailItem label="Place" value={member.place} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <DetailItem label="Join Date" value={formatDate(member.joinDate)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <DetailItem label="Plan" value={`₹${member.monthlyAmount}/month for ${member.totalMonths} months`} />
          </Grid>
        </Grid>
      </Paper>

      {/* Payment History */}
      <Typography variant="h6" sx={{ mb: 1.5 }}>Payment History</Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Installment</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell align="right">Remaining</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No payments recorded yet</Typography>
                </TableCell>
              </TableRow>
            )}
            {payments.map((payment) => (
              <TableRow key={payment.id} hover>
                <TableCell>#{payment.installmentNumber}</TableCell>
                <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(payment.amountPaid)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: moneyFontFamily, color: payment.remainingAmount > 0 ? 'error.main' : 'text.secondary' }}>
                  {formatCurrency(payment.remainingAmount)}
                </TableCell>
                <TableCell><PaymentMethodBadge method={payment.paymentMethod} /></TableCell>
                <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                <TableCell><StatusChip status={payment.status} /></TableCell>
                <TableCell align="center">
                  <Tooltip title="Edit payment">
                    <IconButton size="small" onClick={() => setPaymentDialog({ open: true, payment })}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete payment">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(payment)}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <SavingsPaymentFormDialog
        open={paymentDialog.open} member={member} payment={paymentDialog.payment}
        submitting={submitting} onSubmit={handleSavePayment}
        onClose={() => setPaymentDialog({ open: false, payment: null })}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)} title="Delete payment?"
        message="This will permanently remove this installment payment."
        loading={submitting} onConfirm={handleDeletePayment}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
