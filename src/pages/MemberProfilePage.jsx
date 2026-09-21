import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Grid, Chip, IconButton,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Tooltip, Alert, Button, Divider, Tab, Tabs,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddCardRoundedIcon from '@mui/icons-material/AddCardRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import TableViewRoundedIcon from '@mui/icons-material/TableViewRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { memberService } from '../services/memberService';
import { paymentService } from '../services/paymentService';
import { extractErrorMessage } from '../services/apiClient';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate, weekdayLabel } from '../utils/formatters';
import { moneyFontFamily } from '../styles/theme';
import StatusChip from '../components/common/StatusChip';
import PaymentMethodBadge from '../components/common/PaymentMethodBadge';
import PaymentFormDialog from '../components/payments/PaymentFormDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import NomineeImageDialog from '../components/common/NomineeImageDialog';
import MemberPrintDocument from '../components/members/MemberPrintDocument';

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// Friendly display labels for the enum-style values collected on the
// Create Member form (e.g. "MARRIED" -> "Married").
function titleCase(value) {
  if (!value) return null;
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function genderLabel(value) {
  if (value === 'MALE') return 'Male';
  if (value === 'FEMALE') return 'Female';
  return null;
}

function houseLabel(value) {
  if (value === 'OWN') return 'Own';
  if (value === 'RENT') return 'Rent';
  return null;
}

export default function MemberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  // Uploading a nominee image is Admin-only — Staff/Viewer only get to view/download
  // (enforced here for the UI, and again on the backend via SecurityConfig).
  const isAdmin = user?.role === 'ADMIN';

  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState(0);

  const [paymentDialog, setPaymentDialog] = useState({ open: false, payment: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [closeLoanOpen, setCloseLoanOpen] = useState(false);
  const [closingLoan, setClosingLoan] = useState(false);
  const [deleteMemberOpen, setDeleteMemberOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Optional photo shown on the printed member document — reuses the first
  // uploaded nominee image, since that's the only photo storage this app has.
  const [printPhotoUrl, setPrintPhotoUrl] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [memberData, paymentsData] = await Promise.all([
        memberService.getById(id),
        paymentService.getByMember(id),
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

  // Refetches just member.nomineeImageCount (and the rest of member) without
  // the full-page loading spinner — used so the "View Image (N)" badge stays
  // accurate immediately after an upload or delete inside NomineeImageDialog,
  // instead of only updating on the next full page load/refresh.
  const refreshMemberSilently = useCallback(async () => {
    try {
      const memberData = await memberService.getById(id);
      setMember(memberData);
    } catch {
      // Non-critical — the count will simply catch up next time `load()` runs.
    }
  }, [id]);

  // Fetch the first nominee image (if any) as an object URL, for the optional
  // photo box on the printed document. Cleaned up whenever it changes/unmounts
  // so we don't leak object URLs.
  useEffect(() => {
    if (!member?.nomineeImageCount) {
      setPrintPhotoUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl = null;
    memberService.getNomineeImages(id)
      .then((images) => {
        const first = images?.[0];
        if (!first || cancelled) return null;
        return memberService.getNomineeImageBlob(id, first.id);
      })
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPrintPhotoUrl(objectUrl);
      })
      .catch(() => { /* photo is optional — silently skip if it can't be loaded */ });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, member?.nomineeImageCount]);

  const handleSavePayment = async (payload) => {
    setSubmitting(true);
    try {
      if (paymentDialog.payment) {
        await paymentService.update(paymentDialog.payment.id, payload);
        showSuccess('Payment updated');
      } else {
        await paymentService.create(payload);
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
      await paymentService.remove(deleteTarget.id);
      showSuccess('Payment deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseLoan = async () => {
    setClosingLoan(true);
    try {
      await memberService.closeLoan(id);
      showSuccess('Loan closed successfully');
      setCloseLoanOpen(false);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setClosingLoan(false);
    }
  };

  const handleDeleteMember = async () => {
    setDeletingMember(true);
    try {
      await memberService.remove(id);
      showSuccess('Member deleted');
      setDeleteMemberOpen(false);
      navigate('/collection');
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setDeletingMember(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    setUploadingImage(true);
    try {
      await memberService.uploadNomineeImage(id, file);
      showSuccess('Nominee image uploaded');
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setUploadingImage(false);
    }
  };

  // Called when the nominee-image gallery dialog closes, so "View Image (N)"
  // is guaranteed correct right away even if NomineeImageDialog doesn't (yet)
  // report deletions as they happen — see refreshMemberSilently for the
  // immediate-while-open version.
  const handleImageDialogClose = () => {
    setImageDialogOpen(false);
    refreshMemberSilently();
  };

  // ─────────────────────────────────────────────
  // EXPORT PDF
  // ─────────────────────────────────────────────

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const periodLabel = member.paymentFrequency === 'MONTHLY' ? 'Month' : 'Week';

    doc.setFontSize(14);
    doc.text('Anbu Foundation', 14, 16);
    doc.setFontSize(11);
    doc.text('Member Collection Summary', 14, 23);

    autoTable(doc, {
      startY: 30,
      theme: 'plain',
      styles: { fontSize: 10 },
      body: [
        ['Name', member.name, 'Member Code', member.memberCode],
        ['Phone Number', member.phoneNumber || '-', 'Status', member.status],
        ['Center Place', member.centerPlace || '-', 'Center Code', member.centerCode || '-'],
        ['Member Type', member.headMember ? 'Head Member' : 'Regular Member', 'Join Date', formatDate(member.joinDate)],
        ['Weekly Amount', formatCurrency(member.weeklyAmount), 'Credit Balance', formatCurrency(member.creditBalance)],
        ['Total Payments', String(payments.length), 'Outstanding Balance', formatCurrency(member.totalBalance)],
      ],
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { fontStyle: 'bold' },
      },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [[periodLabel, 'Paid', 'Remaining', 'Method', 'Date', 'Status']],
      body: payments.map((p) => [
        `${member.paymentFrequency === 'MONTHLY' ? 'M' : 'W'}${p.weekNumber} / ${p.paymentYear}`,
        formatCurrency(p.amountPaid),
        formatCurrency(p.remainingAmount),
        p.paymentMethod,
        formatDate(p.paymentDate),
        p.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 101, 192] },
    });

    doc.save(`${member.memberCode || member.name}-collection.pdf`);
  };

  // ─────────────────────────────────────────────
  // EXPORT EXCEL
  // ─────────────────────────────────────────────

  const handleExportExcel = () => {
    const periodLabel = member.paymentFrequency === 'MONTHLY' ? 'Month' : 'Week';

    const infoRows = [
      { Field: 'Name', Value: member.name },
      { Field: 'Member Code', Value: member.memberCode },
      { Field: 'Phone Number', Value: member.phoneNumber || '-' },
      { Field: 'Status', Value: member.status },
      { Field: 'Center Place', Value: member.centerPlace || '-' },
      { Field: 'Center Code', Value: member.centerCode || '-' },
      { Field: 'Member Type', Value: member.headMember ? 'Head Member' : 'Regular Member' },
      { Field: 'Join Date', Value: formatDate(member.joinDate) },
      { Field: 'Weekly Amount', Value: member.weeklyAmount },
      { Field: 'Credit Balance', Value: member.creditBalance },
      { Field: 'Total Payments', Value: payments.length },
      { Field: 'Outstanding Balance', Value: member.totalBalance },
    ];

    const paymentRows = payments.map((p) => ({
      [periodLabel]: `${member.paymentFrequency === 'MONTHLY' ? 'M' : 'W'}${p.weekNumber} / ${p.paymentYear}`,
      Paid: p.amountPaid,
      Remaining: p.remainingAmount,
      Method: p.paymentMethod,
      Date: formatDate(p.paymentDate),
      Status: p.status,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(infoRows), 'Member Info');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(paymentRows), 'Payment History');
    XLSX.writeFile(workbook, `${member.memberCode || member.name}-collection.xlsx`);
  };

  // ─────────────────────────────────────────────
  // PRINT
  // ─────────────────────────────────────────────

  const handlePrint = () => window.print();

  if (loading) return <LoadingSpinner label="Loading member profile..." fullHeight />;
  if (error) return <Box><Alert severity="error">{error}</Alert></Box>;
  if (!member) return null;

  const dueHistory = payments.filter((p) => Number(p.remainingAmount) > 0);
  const outstandingBalance = Number(member.totalBalance) || 0;
  const isLoanClosed = member.status === 'CLOSED';
  const canCloseLoan = !isLoanClosed && outstandingBalance <= 0 && Number(member.totalPaid) > 0;
  const hasDocuments = member.aadhaarNumber || member.panNumber || member.voterId || member.smartCardNumber;
  const hasBankDetails = member.bankName || member.bankAccountNumber;
  const hasNominee = member.nomineeName;
  const fatherOrHusbandLabel = member.fatherOrHusbandRelation === 'HUSBAND' ? "Husband's Name" : "Father's Name";

  return (
    <Box>
      {/* Printed output is the formal member document below, not this on-screen
          dashboard view — so the whole view is hidden for print (no-print),
          and only MemberPrintDocument (print-only) is shown. */}
      <Box className="no-print">
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        {/* Line 1: identity, status, and the loan/delete actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <IconButton className="no-print" onClick={() => navigate('/collection')}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {member.headMember && (
              <Tooltip title="Head member">
                <StarRoundedIcon sx={{ color: 'secondary.main' }} />
              </Tooltip>
            )}
            <Typography variant="h5" sx={{ fontWeight: member.headMember ? 700 : 600 }}>
              {member.name}
            </Typography>
            {member.headMember && <Chip label="HEAD MEMBER" color="warning" size="small" />}
          </Box>
          <Chip label={member.centerCode} size="small" sx={{ fontFamily: moneyFontFamily }} />
          <Chip
            label={member.status}
            size="small"
            color={member.status === 'ACTIVE' ? 'success' : member.status === 'CLOSED' ? 'info' : 'default'}
          />
          {member.centerPlace && <Chip label={member.centerPlace} size="small" variant="outlined" />}
          <Box sx={{ flex: 1 }} />
          <Box className="no-print" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isLoanClosed && (
              <Tooltip title={canCloseLoan ? '' : 'All payments must be completed before the loan can be closed'}>
                <span>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<TaskAltRoundedIcon />}
                    disabled={!canCloseLoan}
                    onClick={() => setCloseLoanOpen(true)}
                  >
                    Close Loan
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteRoundedIcon />}
              onClick={() => setDeleteMemberOpen(true)}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {/* Line 2: Upload Image, bottom-right — Admin-only. Staff/Viewer can still
            view and download nominee images from the Nominee section below, but
            cannot upload (enforced here and again on the backend). */}
        {isAdmin && (
          <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileSelected}
            />
                       <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFileRoundedIcon />}
              disabled={uploadingImage}
              onClick={handleUploadClick}
              sx={{
                color: '#1565C0',
                borderColor: '#1565C0',
                '&:hover': { borderColor: '#0D47A1', backgroundColor: 'rgba(21, 101, 192, 0.04)' },
              }}
            >
              {uploadingImage ? 'Uploading...' : 'Upload Image'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Weekly Amount</Typography>
            <Typography variant="h6" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(member.weeklyAmount)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Credit Balance</Typography>
            <Typography variant="h6" sx={{ fontFamily: moneyFontFamily, color: 'success.main' }}>{formatCurrency(member.creditBalance)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Total Payments</Typography>
            <Typography variant="h6">{payments.length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Join Date</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(member.joinDate)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {dueHistory.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {dueHistory.length} {member.paymentFrequency === 'MONTHLY' ? 'month' : 'week'}{dueHistory.length > 1 ? 's' : ''} with outstanding balance —
          total {formatCurrency(dueHistory.reduce((s, p) => s + Number(p.remainingAmount), 0))}
        </Alert>
      )}

      {/* Tabs */}
            {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, flex: 1, minHeight: 48 }}>
            <Tab label="Personal Info" />
            {hasDocuments && <Tab icon={<BadgeRoundedIcon fontSize="small" />} label="Documents" iconPosition="start" />}
            {hasBankDetails && <Tab icon={<AccountBalanceRoundedIcon fontSize="small" />} label="Bank Details" iconPosition="start" />}
            {hasNominee && <Tab icon={<PeopleRoundedIcon fontSize="small" />} label="Nominee" iconPosition="start" />}
          </Tabs>
          {hasNominee && (
            <Tooltip title={member.nomineeImageCount > 0 ? '' : 'No nominee images uploaded yet'}>
              <span className="no-print">
                                <Button
                  size="small"
                  startIcon={<VisibilityRoundedIcon fontSize="small" />}
                  disabled={!member.nomineeImageCount}
                  onClick={() => setImageDialogOpen(true)}
                  sx={{
                    mr: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                    color: '#b1abab',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    '&.Mui-disabled': { color: 'rgba(211, 198, 198, 0.26)' },
                  }}
                >
                  View Image{member.nomineeImageCount > 0 ? ` (${member.nomineeImageCount})` : ''}
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ p: 2 }}>
          {/* Personal Info */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Phone Number" value={member.phoneNumber} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Alternate Phone Number" value={member.alternatePhoneNumber || '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Gender" value={genderLabel(member.gender) || '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label={fatherOrHusbandLabel} value={member.fatherOrHusbandName || '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Marriage Status" value={titleCase(member.marriageStatus) || '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Date of Birth" value={member.dateOfBirth ? formatDate(member.dateOfBirth) : '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="House" value={houseLabel(member.house) || '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Center Place" value={member.centerPlace} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Center Code" value={member.centerCode || '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Member Type" value={member.headMember ? 'Head Member' : 'Regular Member'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Collection Day" value={member.weekday ? weekdayLabel(member.weekday) : '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Join Date" value={formatDate(member.joinDate)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Loan Amount" value={member.loanAmount ? formatCurrency(member.loanAmount) : '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DetailItem label="Purpose of Loan" value={member.purposeOfLoan || '-'} />
              </Grid>
              <Grid size={12}>
                <DetailItem label="Address" value={member.address} />
              </Grid>
              {member.notes && (
                <Grid size={12}>
                  <DetailItem label="Notes" value={member.notes} />
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {/* Documents */}
          {hasDocuments && (
            <TabPanel value={tab} index={1}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Aadhaar Number" value={member.aadhaarNumber} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="PAN Card Number" value={member.panNumber} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Voter ID" value={member.voterId} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Smart Card Number" value={member.smartCardNumber} />
                </Grid>
              </Grid>
            </TabPanel>
          )}

          {/* Bank Details */}
          {hasBankDetails && (
            <TabPanel value={tab} index={hasDocuments ? 2 : 1}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Bank Name" value={member.bankName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Account Number" value={member.bankAccountNumber} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Cheque Number" value={member.chequeNumber} />
                </Grid>
                {Number(member.insuranceAmount) > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem label="Insurance Amount" value={formatCurrency(member.insuranceAmount)} />
                  </Grid>
                )}
                {Number(member.processingAmount) > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem label="Processing Amount" value={formatCurrency(member.processingAmount)} />
                  </Grid>
                )}
              </Grid>
            </TabPanel>
          )}

          {/* Nominee */}
          {hasNominee && (
            <TabPanel value={tab} index={(hasDocuments ? 1 : 0) + (hasBankDetails ? 1 : 0) + 1}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Nominee Name" value={member.nomineeName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Nominee Phone Number" value={member.nomineePhoneNumber} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Relation" value={member.nomineeRelation} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Gender" value={genderLabel(member.nomineeGender) || '-'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Nominee Aadhaar" value={member.nomineeAadhaar} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Nominee PAN" value={member.nomineePan} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DetailItem label="Nominee Voter ID" value={member.nomineeVoterId} />
                </Grid>
              </Grid>
            </TabPanel>
          )}
        </Box>
      </Paper>

      {/* Payment History */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Typography variant="h6">Payment History</Typography>

        <Box className="no-print" sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PictureAsPdfRoundedIcon fontSize="small" />}
            onClick={handleExportPdf}
          >
            Export PDF
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<TableViewRoundedIcon fontSize="small" />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintRoundedIcon fontSize="small" />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </Box>
      </Box>
      <Paper variant="outlined">
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>{member.paymentFrequency === 'MONTHLY' ? 'Month' : 'Week'}</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Remaining</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center" className="no-print">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No payments recorded yet</Typography>
                  </TableCell>
                </TableRow>
              )}
              {payments.map((payment) => (
                <TableRow key={payment.id} hover>
                  <TableCell>{member.paymentFrequency === 'MONTHLY' ? 'M' : 'W'}{payment.weekNumber} / {payment.paymentYear}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(payment.amountPaid)}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: moneyFontFamily, color: payment.remainingAmount > 0 ? 'error.main' : 'text.secondary' }}>
                    {formatCurrency(payment.remainingAmount)}
                  </TableCell>
                  <TableCell><PaymentMethodBadge method={payment.paymentMethod} /></TableCell>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell><StatusChip status={payment.status} /></TableCell>
                  <TableCell align="center" className="no-print">
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
        </TableContainer>
      </Paper>
      </Box>

      {/* Print-only: the formal document that actually gets printed (see index.css) */}
      <Box className="print-only">
        <MemberPrintDocument member={member} photoUrl={printPhotoUrl} />
      </Box>

      <PaymentFormDialog
        open={paymentDialog.open} member={member} payment={paymentDialog.payment} payments={payments}
        submitting={submitting} onSubmit={handleSavePayment}
        onClose={() => setPaymentDialog({ open: false, payment: null })}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)} title="Delete payment?"
        message="This will remove the payment and adjust the member's credit balance."
        loading={submitting} onConfirm={handleDeletePayment}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={closeLoanOpen}
        title="Close loan?"
        message={`This marks ${member.name}'s loan as CLOSED. All payments have been fully collected (total paid: ${formatCurrency(member.totalPaid)}). This cannot be undone from here.`}
        confirmLabel="Close Loan"
        confirmColor="primary"
        loading={closingLoan}
        onConfirm={handleCloseLoan}
        onCancel={() => setCloseLoanOpen(false)}
      />
      <ConfirmDialog
        open={deleteMemberOpen}
        title="Delete member?"
        message={`This will permanently delete ${member.name} and all their payment history. This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deletingMember}
        onConfirm={handleDeleteMember}
        onCancel={() => setDeleteMemberOpen(false)}
      />
      <NomineeImageDialog
        open={imageDialogOpen}
        onClose={handleImageDialogClose}
        onImagesChanged={refreshMemberSilently}
        memberId={id}
        memberName={member.name}
      />
    </Box>
  );
}