import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  TextField,
  InputAdornment,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Grid,
  Divider,
  MenuItem,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PriceChangeRoundedIcon from '@mui/icons-material/PriceChangeRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';

import { memberService } from '../services/memberService';
import { dashboardService } from '../services/dashboardService';
import { capitalService } from '../services/capitalService';
import { extractErrorMessage } from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import { formatCurrency, todayIso } from '../utils/formatters';
import { moneyFontFamily, brandColors } from '../styles/theme';

import MemberFormDialog from '../components/members/MemberFormDialog';
import MemberChargesDialog from '../components/members/MemberChargesDialog';
import SummaryCards from '../components/charts/SummaryCards';
import InsuranceProcessingSummaryCards from '../components/charts/InsuranceProcessingSummaryCards';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

// ---- Brand styling (logo colors: black / red / yellow) ----
const sectionTitleSx = {
  mb: 2,
  pl: 1.5,
  lineHeight: 1.3,
  borderLeft: `4px solid ${brandColors.teal700}`,
};

const tableHeadSx = {
  '& .MuiTableCell-head': {
    bgcolor: brandColors.teal900,
    color: '#FFFFFF',
    borderBottom: `3px solid ${brandColors.teal700}`,
  },
};

const brandButtonSx = {
  '&:hover': { bgcolor: brandColors.teal700 },
};

const EMPTY_ENTRY_FORM = { type: 'INCOME', amount: '', purpose: '', transactionDate: todayIso() };

// Insurance & Processing entry form (localStorage-backed, deducts from
// the Total Insurance & Processing Collected figure shown in the cards)
const PI_ENTRIES_STORAGE_KEY = 'microfinance_admin_pi_entries';
const EMPTY_PI_ENTRY_FORM = { category: '', amount: '' };

export default function AdminPage() {
  const { showSuccess, showError } = useToast();

  // ---- Total Collection Details (moved here from the Dashboard page) ----
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const result = await dashboardService.summary();
      setSummary(result);
    } catch (err) {
      setSummaryError(extractErrorMessage(err));
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // ---- Insurance & Processing summary ----
  const [insuranceProcessingSummary, setInsuranceProcessingSummary] = useState(null);
  const [insuranceSummaryLoading, setInsuranceSummaryLoading] = useState(true);
  const [insuranceSummaryError, setInsuranceSummaryError] = useState('');

  const loadInsuranceProcessingSummary = useCallback(async () => {
    setInsuranceSummaryLoading(true);
    setInsuranceSummaryError('');
    try {
      const result = await dashboardService.insuranceProcessingSummary();
      setInsuranceProcessingSummary(result);
    } catch (err) {
      setInsuranceSummaryError(extractErrorMessage(err));
    } finally {
      setInsuranceSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsuranceProcessingSummary();
  }, [loadInsuranceProcessingSummary]);

  // ---- Insurance & Processing Entry Form (localStorage-backed) ----
  const [piEntryForm, setPiEntryForm] = useState(EMPTY_PI_ENTRY_FORM);
  const [piEntryError, setPiEntryError] = useState('');
  const [piEditingEntryId, setPiEditingEntryId] = useState(null);

  const [piEntries, setPiEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(PI_ENTRIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PI_ENTRIES_STORAGE_KEY, JSON.stringify(piEntries));
    } catch {
      // Ignore storage errors (e.g. private browsing quota limits)
    }
  }, [piEntries]);

  // Sum of amounts entered in the Insurance & Processing entry form so far,
  // so the summary cards can be shown net of whatever has already been
  // entered (each entry deducts from the combined Total Insurance &
  // Processing Collected figure only; Members Paid is unaffected).
  const piEnteredTotal = useMemo(() => {
    return piEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [piEntries]);

  const totalInsuranceProcessingCollection = Math.max(
    0,
    Number(insuranceProcessingSummary?.totalInsuranceCollected ?? 0) +
      Number(insuranceProcessingSummary?.totalProcessingCollected ?? 0) -
      piEnteredTotal
  );

  // Net-of-entries version of the insurance/processing summary: only the
  // combined "Total insurance & processing collected" card is adjusted by
  // piEnteredTotal; Members Paid, Total Insurance, and Total Processing
  // stay as reported by the backend.
  const adjustedInsuranceProcessingSummary = insuranceProcessingSummary
    ? {
        ...insuranceProcessingSummary,
        totalCollected: totalInsuranceProcessingCollection,
      }
    : insuranceProcessingSummary;

  const handlePiEntryChange = (field) => (e) => {
    setPiEntryForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetPiEntryForm = () => {
    setPiEntryForm(EMPTY_PI_ENTRY_FORM);
    setPiEditingEntryId(null);
    setPiEntryError('');
  };

  const handlePiEntrySubmit = (e) => {
    e.preventDefault();

    const amount = Number(piEntryForm.amount);

    if (!piEntryForm.category.trim()) {
      setPiEntryError('Enter a purpose for this amount');
      return;
    }

    if (!piEntryForm.amount || Number.isNaN(amount) || amount <= 0) {
      setPiEntryError('Enter a valid amount greater than 0');
      return;
    }

    const availableBalance =
      totalInsuranceProcessingCollection +
      (piEditingEntryId
        ? piEntries.find((entry) => entry.id === piEditingEntryId)?.amount ?? 0
        : 0);

    if (amount > availableBalance) {
      setPiEntryError('Amount exceeds the available Total Insurance & Processing Collected');
      return;
    }

    setPiEntryError('');

    if (piEditingEntryId) {
      setPiEntries((prev) =>
        prev.map((entry) =>
          entry.id === piEditingEntryId
            ? { ...entry, amount, category: piEntryForm.category }
            : entry
        )
      );
      showSuccess('Entry updated');
    } else {
      setPiEntries((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}`,
          amount,
          category: piEntryForm.category,
        },
      ]);
      showSuccess('Entry recorded and deducted from Total Insurance & Processing Collected');
    }

    resetPiEntryForm();
  };

  const handlePiEditEntry = (entry) => {
    setPiEntryForm({
      amount: String(entry.amount),
      category: entry.category,
    });
    setPiEditingEntryId(entry.id);
    setPiEntryError('');
  };

  const handlePiDeleteEntry = (entry) => {
    setPiEntries((prev) => prev.filter((item) => item.id !== entry.id));

    if (piEditingEntryId === entry.id) {
      resetPiEntryForm();
    }

    showSuccess('Entry deleted');
  };

  // ---- Capital Amount ----
  const [capital, setCapital] = useState(null);
  const [capitalLoading, setCapitalLoading] = useState(true);
  const [capitalError, setCapitalError] = useState('');
  const [capitalInput, setCapitalInput] = useState('');
  const [capitalSaving, setCapitalSaving] = useState(false);

  const loadCapital = useCallback(async () => {
    setCapitalLoading(true);
    setCapitalError('');
    try {
      const result = await capitalService.getAccount();
      setCapital(result);
    } catch (err) {
      setCapitalError(extractErrorMessage(err));
    } finally {
      setCapitalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapital();
  }, [loadCapital]);

  const handleSaveCapital = async (e) => {
    e.preventDefault();
    const amount = Number(capitalInput);
    if (capitalInput === '' || Number.isNaN(amount) || amount < 0) {
      showError('Enter a valid capital amount (0 or more)');
      return;
    }
    setCapitalSaving(true);
    try {
      const result = await capitalService.setCapitalAmount(amount);
      setCapital(result);
      setCapitalInput('');
      showSuccess('Capital amount updated');
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setCapitalSaving(false);
    }
  };

  // ---- Income / Expense entry form (tracked against Total Collection) ----
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [entryError, setEntryError] = useState('');
  const [entrySubmitting, setEntrySubmitting] = useState(false);

  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = useState(null);

  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    setEntriesError('');
    try {
      const result = await capitalService.listTransactions();
      setEntries(result || []);
    } catch (err) {
      setEntriesError(extractErrorMessage(err));
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleEntryChange = (field) => (e) => {
    setEntryForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const resetEntryForm = () => {
    setEntryForm(EMPTY_ENTRY_FORM);
    setEditingEntryId(null);
    setEntryError('');
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();

    const amount = Number(entryForm.amount);

    if (!entryForm.amount || Number.isNaN(amount) || amount <= 0) {
      setEntryError('Enter a valid amount greater than 0');
      return;
    }

    setEntryError('');
    setEntrySubmitting(true);

    const payload = {
      type: entryForm.type,
      amount,
      purpose: entryForm.purpose.trim() || null,
      transactionDate: entryForm.transactionDate || todayIso(),
    };

    try {
      if (editingEntryId) {
        await capitalService.updateTransaction(editingEntryId, payload);
        showSuccess('Entry updated');
      } else {
        await capitalService.createTransaction(payload);
        showSuccess(
          entryForm.type === 'INCOME'
            ? 'Income added to Total Collection'
            : 'Expense deducted from Total Collection'
        );
      }

      resetEntryForm();
      await loadEntries();
      await loadSummary();
      await loadCapital();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setEntrySubmitting(false);
    }
  };

  const handleEditEntry = (entry) => {
    setEntryForm({
      type: entry.type,
      amount: String(entry.amount),
      purpose: entry.purpose || '',
      transactionDate: entry.transactionDate || todayIso(),
    });
    setEditingEntryId(entry.id);
    setEntryError('');
  };

  const handleDeleteEntryConfirm = async () => {
    setEntrySubmitting(true);
    try {
      await capitalService.removeTransaction(deleteEntryTarget.id);
      showSuccess('Entry deleted');
      if (editingEntryId === deleteEntryTarget.id) {
        resetEntryForm();
      }
      setDeleteEntryTarget(null);
      await loadEntries();
      await loadSummary();
      await loadCapital();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setEntrySubmitting(false);
    }
  };

  // ---- Loan Outstanding Amounts (head members table) ----
  const [heads, setHeads] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [memberDialog, setMemberDialog] = useState({ open: false, member: null });
  const [chargesDialog, setChargesDialog] = useState({ open: false, member: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const accordionCacheRef = useRef(null);

  const loadHeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await memberService.list({
        keyword: search || undefined,
        page,
        size: rowsPerPage,
        sortBy: 'name',
        sortDir: 'asc',
      });
      setHeads(result.content);
      setTotalElements(result.totalElements);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage]);

  useEffect(() => {
    loadHeads();
  }, [loadHeads]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const handleUpdateMember = async (payload) => {
    setSubmitting(true);
    const previousHeadId = memberDialog.member?.headMemberId;
    try {
      await memberService.update(memberDialog.member.id, payload.member);
      showSuccess('Member updated successfully');
      setMemberDialog({ open: false, member: null });
      loadHeads();
      if (previousHeadId) {
        accordionCacheRef.current?.invalidateHead(previousHeadId);
      }
      if (
        !payload.member.headMember &&
        payload.member.headMemberId &&
        payload.member.headMemberId !== previousHeadId
      ) {
        accordionCacheRef.current?.invalidateHead(payload.member.headMemberId);
      }
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setSubmitting(true);
    try {
      await memberService.remove(deleteTarget.id);
      showSuccess('Member deleted');
      const affectedHeadId = deleteTarget.headMemberId;
      setDeleteTarget(null);
      loadHeads();
      if (affectedHeadId) {
        accordionCacheRef.current?.invalidateHead(affectedHeadId);
      }
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCharges = async (values) => {
    setSubmitting(true);
    try {
      await memberService.updateCharges(chargesDialog.member.id, values);
      showSuccess(`Charges updated for ${chargesDialog.member.name}`);
      const affectedHeadId = chargesDialog.member.headMemberId;
      setChargesDialog({ open: false, member: null });
      loadHeads();
      loadInsuranceProcessingSummary();
      if (affectedHeadId) {
        accordionCacheRef.current?.invalidateHead(affectedHeadId);
      }
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }} className="no-print">
        Admin
      </Typography>

      {/* ── Total Collection Details (moved here from the Dashboard page) ── */}
      <Typography variant="h6" sx={sectionTitleSx} className="no-print">
        Total Collection Details
      </Typography>

      {summaryError && (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print">{summaryError}</Alert>
      )}

      {summaryLoading ? (
        <LoadingSpinner label="Loading collection summary..." />
      ) : (
        <Box sx={{ mb: 4 }} className="no-print">
          <SummaryCards summary={summary} />
        </Box>
      )}

      {/* ── Capital Amount ── */}
      <Typography variant="h6" sx={sectionTitleSx} className="no-print">
        Capital Amount
      </Typography>

      {capitalError && (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print">{capitalError}</Alert>
      )}

      {capitalLoading ? (
        <LoadingSpinner label="Loading capital amount..." />
      ) : (
        <Paper variant="outlined" sx={{ p: 2, mb: 4 }} className="no-print">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Capital Amount
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: moneyFontFamily, color: 'success.main' }}>
                {formatCurrency(capital?.capitalAmount)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Total Collection (All Time)
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: moneyFontFamily }}>
                {formatCurrency(capital?.totalCollectionAllTime)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Used From Collection
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: moneyFontFamily, color: (theme) => (theme.palette.mode === 'dark' ? brandColors.amber : brandColors.amberDark) }}>
                {formatCurrency(capital?.collectionUtilized)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Total Amount
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: moneyFontFamily, color: 'success.main' }}>
                {formatCurrency(capital?.totalAmount)}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box
            component="form"
            onSubmit={handleSaveCapital}
            sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <TextField
              label="Add to Capital Amount"
              type="number"
              size="small"
              value={capitalInput}
              onChange={(e) => setCapitalInput(e.target.value)}
              sx={{ width: { xs: '100%', sm: 220 } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
            />
            <Button type="submit" variant="contained" sx={brandButtonSx} startIcon={<SaveRoundedIcon />} disabled={capitalSaving}>
              {capitalSaving ? 'Saving...' : 'Add'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ── Income / Expense Entry Form ── */}
      <Typography variant="h6" sx={sectionTitleSx} className="no-print">
        Entry Form (Income / Expense)
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }} className="no-print">
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Box component="form" onSubmit={handleEntrySubmit}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Type"
                    value={entryForm.type}
                    onChange={handleEntryChange('type')}
                  >
                    <MenuItem value="INCOME">Income</MenuItem>
                    <MenuItem value="EXPENSE">Expense</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Purpose / Reason"
                    placeholder="Enter purpose or reason for the amount"
                    value={entryForm.purpose}
                    onChange={handleEntryChange('purpose')}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Amount"
                    placeholder="Enter amount"
                    value={entryForm.amount}
                    onChange={handleEntryChange('amount')}
                    error={Boolean(entryError)}
                    helperText={entryError || ' '}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Date"
                    value={entryForm.transactionDate}
                    onChange={handleEntryChange('transactionDate')}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>

                <Grid size={12}>
                  <Button type="submit" variant="contained" color="primary" sx={brandButtonSx} startIcon={<SaveRoundedIcon />} disabled={entrySubmitting}>
                    {editingEntryId ? 'Update Entry' : 'Save Entry'}
                  </Button>
                  {editingEntryId && (
                    <Button variant="outlined" sx={{ ml: 1 }} startIcon={<CloseRoundedIcon />} onClick={resetEntryForm}>
                      Cancel
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
    }}
  >
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: brandColors.teal900,
        color: brandColors.teal300,
        flexShrink: 0,
      }}
    >
      <AccountBalanceWalletRoundedIcon fontSize="small" />
    </Box>

    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block' }}
      >
        Total Amount
      </Typography>

      <Typography
        variant="h5"
        sx={{
          fontFamily: moneyFontFamily,
          fontWeight: 500,
          mt: 0.5,
          color: 'success.main',
        }}
      >
        {summaryLoading || capitalLoading
          ? '...'
          : formatCurrency(capital?.totalAmount)}
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 0.5 }}
      >
      </Typography>
    </Box>
  </Paper>
</Grid>
      </Grid>


      {entriesError && (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print">{entriesError}</Alert>
      )}

      {entriesLoading ? (
        <LoadingSpinner label="Loading entries..." />
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }} className="no-print">
          <Table size="small">
            <TableHead sx={tableHeadSx}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Purpose / Reason</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No entries yet</Typography>
                  </TableCell>
                </TableRow>
              )}
              {entries.map((entry) => (
                <TableRow key={entry.id} hover selected={editingEntryId === entry.id}>
                  <TableCell>{entry.transactionDate}</TableCell>
                  <TableCell>
                    <Chip
                      label={entry.type === 'INCOME' ? 'Income' : 'Expense'}
                      size="small"
                      color={entry.type === 'INCOME' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: moneyFontFamily,
                      color: entry.type === 'INCOME' ? 'success.main' : 'error.main',
                    }}
                  >
                    {entry.type === 'INCOME' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </TableCell>
                  <TableCell>{entry.purpose || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit entry">
                      <IconButton size="small" onClick={() => handleEditEntry(entry)}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete entry">
                      <IconButton size="small" color="error" onClick={() => setDeleteEntryTarget(entry)}>
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


      {/* ── Insurance & Processing ── */}
      <Typography variant="h6" sx={sectionTitleSx} className="no-print">
        Insurance &amp; Processing Amount Collection
      </Typography>

      {insuranceSummaryError && (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print">{insuranceSummaryError}</Alert>
      )}

      {insuranceSummaryLoading ? (
        <LoadingSpinner label="Loading insurance & processing summary..." />
      ) : (
        <Box sx={{ mb: 4 }} className="no-print">
          <InsuranceProcessingSummaryCards summary={adjustedInsuranceProcessingSummary} />
        </Box>
      )}

      {/* ── Insurance & Processing Entry Form ── */}
      <Typography variant="h6" sx={sectionTitleSx} className="no-print">
        Entry Form (Insurance / Processing)
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }} className="no-print">
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box component="form" onSubmit={handlePiEntrySubmit}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Purpose"
                    placeholder="Enter purpose"
                    value={piEntryForm.category}
                    onChange={handlePiEntryChange('category')}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Amount"
                    placeholder="Enter amount"
                    value={piEntryForm.amount}
                    onChange={handlePiEntryChange('amount')}
                    error={Boolean(piEntryError)}
                    helperText={piEntryError || ' '}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
                  />
                </Grid>

                <Grid size={12}>
                  <Button type="submit" variant="contained" color="primary" sx={brandButtonSx} startIcon={<SaveRoundedIcon />}>
                    {piEditingEntryId ? 'Update Entry' : 'Save Entry'}
                  </Button>
                  {piEditingEntryId && (
                    <Button variant="outlined" sx={{ ml: 1 }} startIcon={<CloseRoundedIcon />} onClick={resetPiEntryForm}>
                      Cancel
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ mb: 4, maxWidth: 640, mx: 'auto' }}
        className="no-print"
      >
        <Table size="small">
          <TableHead sx={tableHeadSx}>
            <TableRow>
              <TableCell sx={{ width: 380 }}>Amount</TableCell>
              <TableCell sx={{ width: 400 }}>Purpose</TableCell>
              <TableCell sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {piEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No entries yet</Typography>
                </TableCell>
              </TableRow>
            )}
            {piEntries.map((entry) => (
              <TableRow key={entry.id} hover selected={piEditingEntryId === entry.id}>
                <TableCell sx={{ fontFamily: moneyFontFamily }}>
                  {formatCurrency(entry.amount)}
                </TableCell>
                <TableCell>
                  {entry.category}
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit entry">
                    <IconButton size="small" onClick={() => handlePiEditEntry(entry)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete entry">
                    <IconButton size="small" color="error" onClick={() => handlePiDeleteEntry(entry)}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Loan Outstanding Amounts ── */}
      <Typography variant="h6" sx={sectionTitleSx} className="no-print">
        Loan Outstanding Amounts
      </Typography>

      <TextField
        size="small"
        placeholder="Search by name, phone, member ID, or place"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
        className="no-print"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} className="no-print">{error}</Alert>
      )}

      {loading ? (
        <LoadingSpinner label="Loading members..." />
      ) : (
        <Box className="no-print" sx={{ mb: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ minWidth: 1100, '& .MuiTableCell-root': { px: 2 }, }}>
              <TableHead sx={tableHeadSx}>
                <TableRow>
                  <TableCell sx={{ width: 110 }}>Member ID</TableCell>
                  <TableCell sx={{ width: 180 }}>Member Name</TableCell>
                  <TableCell sx={{ width: 110 }}>Center Place</TableCell>
                  <TableCell sx={{ width: 110 }}>Loan Amount</TableCell>
                  <TableCell sx={{ width: 110 }}>Total Weeks</TableCell>
                  <TableCell sx={{ width: 110 }}>Interest(%)</TableCell>
                  <TableCell sx={{ width: 110 }}>Without Interest</TableCell>
                  <TableCell sx={{ width: 110 }}>With Interest</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {heads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No members found</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {heads.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>{member.memberCode}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {/* Fixed-width name box so every HEAD chip lines up in a straight column */}
                        <Box
                          component="span"
                          sx={{ width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {member.name}
                        </Box>
                        {member.headMember && (
                          <Chip
                            icon={<StarRoundedIcon />}
                            size="small"
                            sx={{
                              ml: 1,
                              fontWeight: 600,
                              bgcolor: brandColors.teal300,
                              color: brandColors.teal900,
                              '& .MuiChip-icon': { color: brandColors.teal900, mx: '6px' },
                              '& .MuiChip-label': {
                                display: 'none',  // remove the empty label's padding
                              },
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{member.centerPlace || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: moneyFontFamily }}>
                      {formatCurrency(member.loanAmount)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: moneyFontFamily }}>
                      {member.totalWeeks ?? '-'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: moneyFontFamily }}>
                      {member.interestPercentage != null ? `${member.interestPercentage}%` : '-'}
                    </TableCell>
                    <TableCell sx={{ fontFamily: moneyFontFamily }}>
                      {formatCurrency(member.outstandingAmount)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: moneyFontFamily }}>
                      {formatCurrency(member.outstandingAmountWithInterest)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Box>
      )}

      <Box className="no-print">
        <MemberFormDialog
          open={memberDialog.open}
          member={memberDialog.member}
          submitting={submitting}
          onSubmit={handleUpdateMember}
          onClose={() => setMemberDialog({ open: false, member: null })}
        />

        <MemberChargesDialog
          open={chargesDialog.open}
          member={chargesDialog.member}
          submitting={submitting}
          onSubmit={handleSaveCharges}
          onClose={() => setChargesDialog({ open: false, member: null })}
        />

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete member?"
          message={`This will permanently delete ${deleteTarget?.name} and all their payment history. This cannot be undone.`}
          loading={submitting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />

        <ConfirmDialog
          open={Boolean(deleteEntryTarget)}
          title="Delete entry?"
          message={`This will permanently delete this ${deleteEntryTarget?.type === 'INCOME' ? 'income' : 'expense'} entry of ${formatCurrency(deleteEntryTarget?.amount)} and reverse its effect on Total Collection.`}
          loading={entrySubmitting}
          onConfirm={handleDeleteEntryConfirm}
          onCancel={() => setDeleteEntryTarget(null)}
        />
      </Box>
    </Box>
  );
}