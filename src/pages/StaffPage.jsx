import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
  IconButton, Tooltip, Stack,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

import { staffService } from '../services/staffService';
import { extractErrorMessage } from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../utils/formatters';
import { moneyFontFamily } from '../styles/theme';
import StaffFormDialog from '../components/staff/StaffFormDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function StaffPage() {
  const { showSuccess, showError } = useToast();

  const [staffList, setStaffList] = useState([]);
  const [staffSummary, setStaffSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formDialog, setFormDialog] = useState({ open: false, staff: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, summary] = await Promise.all([
        staffService.list(),
        staffService.summary().catch(() => []),
      ]);
      setStaffList(result || []);
      setStaffSummary(summary || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (formDialog.staff) {
        await staffService.update(formDialog.staff.id, values);
        showSuccess('Staff member updated');
      } else {
        await staffService.create(values);
        showSuccess('Staff member added');
      }
      setFormDialog({ open: false, staff: null });
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setSubmitting(true);
    try {
      await staffService.remove(deleteTarget.id);
      showSuccess('Staff member deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2, width: '100%' }}>
        <Typography variant="h5">Staff Management</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setFormDialog({ open: true, staff: null })}>
          Add Staff
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <LoadingSpinner label="Loading staff..." />
      ) : staffList.length === 0 ? (
        <Alert severity="info" icon={<PersonRoundedIcon />}>
          No staff members yet. Click "Add Staff" to create one — they'll then show up as an assignable option on the Create Member form.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Staff Name</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell>Alternate Phone</TableCell>
                <TableCell>Place</TableCell>
                <TableCell>Reference 1</TableCell>
                <TableCell>Reference 1 Phone</TableCell>
                <TableCell>Reference 2</TableCell>
                <TableCell>Reference 2 Phone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffList.map((staff) => (
                <TableRow key={staff.id} hover>
                  <TableCell>{staff.name}</TableCell>
                  <TableCell>{staff.phoneNumber}</TableCell>
                  <TableCell>{staff.alternatePhoneNumber || '-'}</TableCell>
                  <TableCell>{staff.place || '-'}</TableCell>
                  <TableCell>{staff.reference1Name || '-'}</TableCell>
                  <TableCell>{staff.reference1PhoneNumber || '-'}</TableCell>
                  <TableCell>{staff.reference2Name || '-'}</TableCell>
                  <TableCell>{staff.reference2PhoneNumber || '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit staff member">
                      <IconButton size="small" onClick={() => setFormDialog({ open: true, staff })}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete staff member">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(staff)}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
                </TableContainer>
      )}

      {!loading && staffList.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>Staff Details</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff Name</TableCell>
                  <TableCell align="right">Clients</TableCell>
                  <TableCell align="right">Outstanding (OT)</TableCell>
                  <TableCell align="right">Collection</TableCell>
                  <TableCell align="right">PAR Value</TableCell>
                  <TableCell align="right">Pending Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffSummary.map((row) => (
                  <TableRow key={row.staffId} hover>
                    <TableCell>{row.staffName}</TableCell>
                    <TableCell align="right">{row.activeClients}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(row.outstandingAmount)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily, color: 'success.main' }}>{formatCurrency(row.collectionAmount)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily, color: Number(row.parAmount) > 0 ? 'error.main' : 'text.secondary' }}>{formatCurrency(row.parAmount)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily, color: Number(row.pendingAmount) > 0 ? 'error.main' : 'text.secondary' }}>{formatCurrency(row.pendingAmount)}</TableCell>
                  </TableRow>
                ))}
                {staffSummary.length > 0 && (
                  <TableRow sx={{ '& td': { fontWeight: 700 } }}>
                    <TableCell>Total</TableCell>
                    <TableCell align="right">{staffSummary.reduce((s, r) => s + Number(r.activeClients || 0), 0)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(staffSummary.reduce((s, r) => s + Number(r.outstandingAmount || 0), 0))}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(staffSummary.reduce((s, r) => s + Number(r.collectionAmount || 0), 0))}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(staffSummary.reduce((s, r) => s + Number(r.parAmount || 0), 0))}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(staffSummary.reduce((s, r) => s + Number(r.pendingAmount || 0), 0))}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <StaffFormDialog
        open={formDialog.open}
        staff={formDialog.staff}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={() => setFormDialog({ open: false, staff: null })}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete staff member?"
        message={`This will permanently delete ${deleteTarget?.name}. Any members currently assigned to them will simply become unassigned. This cannot be undone.`}
        confirmLabel="Delete Staff"
        loading={submitting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}