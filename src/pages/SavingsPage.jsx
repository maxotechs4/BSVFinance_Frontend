import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Button, Stack, TablePagination, Alert,
  Paper, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, Chip,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { savingsMemberService } from '../services/savingsMemberService';
import { extractErrorMessage } from '../services/apiClient';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import SavingsMemberFormDialog from '../components/savings/SavingsMemberFormDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function SavingsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [members, setMembers] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [memberDialog, setMemberDialog] = useState({ open: false, member: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await savingsMemberService.list({
        keyword: debouncedSearch || undefined,
        page, size: rowsPerPage, sortBy: 'name', sortDir: 'asc',
      });
      setMembers(result.content);
      setTotalElements(result.totalElements);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, rowsPerPage]);

  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const handleSaveMember = async (payload) => {
    setSubmitting(true);
    try {
      if (memberDialog.member) {
        await savingsMemberService.update(memberDialog.member.id, payload);
        showSuccess('Savings member updated successfully');
      } else {
        await savingsMemberService.create(payload);
        showSuccess('Savings member created successfully');
      }
      setMemberDialog({ open: false, member: null });
      loadMembers();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setSubmitting(true);
    try {
      await savingsMemberService.remove(deleteTarget.id);
      showSuccess('Savings member deleted');
      setDeleteTarget(null);
      loadMembers();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Monthly Savings</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />}
          onClick={() => setMemberDialog({ open: true, member: null })}>
          Create member
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Fixed plan: ₹1,180 / month for 36 months
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search by name, phone, member ID, or place"
          value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 300 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? <LoadingSpinner label="Loading savings members..." /> : (
        <>
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Place</TableCell>
                  <TableCell>Monthly</TableCell>
                  <TableCell>Total Paid</TableCell>
                  <TableCell>Total Balance</TableCell>
                  <TableCell>Installments</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No savings members found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/savings/${m.id}`)}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.memberCode} · {m.phoneNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{m.place}</TableCell>
                      <TableCell>{formatCurrency(m.monthlyAmount)}</TableCell>
                      <TableCell sx={{ color: 'success.main' }}>{formatCurrency(m.totalPaid)}</TableCell>
                      <TableCell sx={{ color: Number(m.totalBalance) > 0 ? 'error.main' : 'success.main' }}>
                        {formatCurrency(m.totalBalance)}
                      </TableCell>
                      <TableCell>{m.installmentsPaid} / {m.totalMonths}</TableCell>
                      <TableCell>
                        <Chip label={m.status} size="small" color={m.status === 'ACTIVE' ? 'success' : 'default'} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Payment history">
                          <IconButton size="small" onClick={() => navigate(`/savings/${m.id}`)}>
                            <ReceiptLongRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit member">
                          <IconButton size="small" onClick={() => setMemberDialog({ open: true, member: m })}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete member">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(m)}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
          <TablePagination component="div" count={totalElements} page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]} />
        </>
      )}

      <SavingsMemberFormDialog
        open={memberDialog.open}
        member={memberDialog.member}
        submitting={submitting}
        onSubmit={handleSaveMember}
        onClose={() => setMemberDialog({ open: false, member: null })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete savings member?"
        message={`This will permanently delete ${deleteTarget?.name} and all their payment history. This cannot be undone.`}
        loading={submitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}