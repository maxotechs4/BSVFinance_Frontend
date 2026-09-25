import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, CircularProgress, InputAdornment,
  Box, ToggleButtonGroup, ToggleButton, Typography,
  Alert, Tab, Tabs, Chip, MenuItem, Stack,
} from '@mui/material';
import { todayIso, isoWeekNumber, isoWeekYear, weekdayLabel } from '../../utils/formatters';
import { WEEKDAY_OPTIONS } from '../../utils/constants';
import { memberService } from '../../services/memberService';
import { staffService } from '../../services/staffService';
import { useAuth } from '../../hooks/useAuth';
import StatusChip from '../common/StatusChip';

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const LOAN_PLAN_OPTIONS = [
  { id: 'w-15000', loanAmount: 15000, weeklyAmount: 700, totalWeeks: 26, frequency: 'WEEKLY' },
  { id: 'w-20000', loanAmount: 20000, weeklyAmount: 880, totalWeeks: 28, frequency: 'WEEKLY' },
  { id: 'w-25000', loanAmount: 25000, weeklyAmount: 1040, totalWeeks: 32, frequency: 'WEEKLY' },
  { id: 'w-30000', loanAmount: 30000, weeklyAmount: 1190, totalWeeks: 32, frequency: 'WEEKLY' },
  { id: 'w-35000', loanAmount: 35000, weeklyAmount: 1320, totalWeeks: 34, frequency: 'WEEKLY' },
  { id: 'w-40000', loanAmount: 40000, weeklyAmount: 1450, totalWeeks: 36, frequency: 'WEEKLY' },
  { id: 'm-30000', loanAmount: 30000, monthlyAmount: 2800, frequency: 'MONTHLY' },
  { id: 'm-40000', loanAmount: 40000, monthlyAmount: 3300, frequency: 'MONTHLY' },
  { id: 'm-50000', loanAmount: 50000, monthlyAmount: 3750, frequency: 'MONTHLY' },
];

const FIELD_TAB_MAP = {
  memberCode: 0, name: 0, headMemberId: 0, centerPlace: 0, groupId: 0, groupName: 0, phoneNumber: 0, alternatePhoneNumber: 0,
  weeklyAmount: 0, loanPlan: 0, address: 0, joinDate: 0, weekday: 0, notes: 0, staffMemberId: 0, interestPercentage: 0,
  marriageStatus: 0, dateOfBirth: 0, house: 0, fatherOrHusbandRelation: 0, fatherOrHusbandName: 0, purposeOfLoan: 0,
  aadhaarNumber: 1, panNumber: 1, voterId: 1, smartCardNumber: 1,
  bankName: 2, bankAccountNumber: 2, chequeNumber: 2,
  nomineeName: 3, nomineePhoneNumber: 3, nomineeRelation: 3, nomineeAadhaar: 3, nomineePan: 3, nomineeVoterId: 3, nomineeGender: 3,
  insuranceAmount: 4, processingAmount: 4,
  weekNumber: 5, paymentYear: 5, amountPaid: 5, paymentDate: 5, paymentMethod: 5, upiTransactionId: 5, remarks: 5,
};

const TAB_LABELS = ['Personal Info', 'Documents', 'Bank Details', 'Nominee', 'Insurance & Processing', 'Initial Payment'];

const emptyValues = {
  // Personal
  memberCode: '', name: '', headMember: false, headMemberId: '', centerPlace: '', groupId: '', groupName: '',
  phoneNumber: '', alternatePhoneNumber: '', address: '',
  // Documents
  aadhaarNumber: '', panNumber: '', voterId: '', smartCardNumber: '',
  // Bank
  bankName: '', bankAccountNumber: '', chequeNumber: '',
  // Nominee
  nomineeName: '', nomineePhoneNumber: '', nomineeRelation: '', nomineeAadhaar: '', nomineePan: '', nomineeVoterId: '', nomineeGender: '',
  // Collection
  loanPlan: '', weeklyAmount: '', joinDate: todayIso(), weekday: '', notes: '', marriageStatus: '', dateOfBirth: '', house: '', gender: '',
  // Father/Husband name, and the loan's stated purpose — shown on the printed Loan Application
  fatherOrHusbandRelation: 'FATHER', fatherOrHusbandName: '', purposeOfLoan: '',
  // Insurance & Processing (one-time charges, editable on both create and edit)
  insuranceAmount: '', processingAmount: '',
  // Interest rate applied to every collection, used to derive Outstanding Amount
  interestPercentage: '',
  // Assigned staff — admin-only field, ignored entirely for STAFF/VIEWER
  staffMemberId: '',
  // Initial payment (create only)
  addInitialPayment: false,
  weekNumber: isoWeekNumber(), paymentYear: isoWeekYear(),
  amountPaid: '', paymentDate: todayIso(), paymentMethod: 'CASH',
  upiTransactionId: '', remarks: '',
};

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function MemberFormDialog({ open, member, submitting, onSubmit, onClose }) {
  const isEdit = Boolean(member);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const lastTabIndex = isEdit ? 4 : 5; // 5 tabs when editing, 6 (incl. Initial Payment) when creating
  const [tab, setTab] = useState(0);
  const [tabErrorMessage, setTabErrorMessage] = useState('');
  const [headOptions, setHeadOptions] = useState([]);
  const [headOptionsLoading, setHeadOptionsLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [staffOptionsLoading, setStaffOptionsLoading] = useState(false);

  // ── New loan for a closed profile: entering a phone number that already
  // belongs to a member is only allowed to proceed when every existing match
  // has a CLOSED loan — that's the same person legitimately starting a fresh
  // loan cycle. If any match's loan is still open, phoneActiveDuplicate blocks
  // submission. Choosing a closed match pre-fills the form from that profile;
  // submitting still creates a brand new member record (new id/memberCode)
  // added under the same head — the original profile is never touched.
  const [phoneMatches, setPhoneMatches] = useState([]);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [reloanSource, setReloanSource] = useState(null);

  const closedPhoneMatches = phoneMatches.filter((m) => m.status === 'CLOSED');
  const activePhoneMatches = phoneMatches.filter((m) => m.status !== 'CLOSED');
  const phoneActiveDuplicate = !reloanSource && activePhoneMatches.length > 0;

  const {
    register, handleSubmit, reset, control, watch, setValue,
    formState: { errors },
  } = useForm({ defaultValues: emptyValues });

  const addInitialPayment = watch('addInitialPayment');
  const paymentMethod = watch('paymentMethod');
  const weeklyAmountValue = watch('weeklyAmount');
  const amountPaidValue = watch('amountPaid');
  const interestPercentageValue = watch('interestPercentage');
  const selectedLoanPlan = watch('loanPlan');
  const selectedLoanPlanDetails = LOAN_PLAN_OPTIONS.find((p) => p.id === selectedLoanPlan);
  const selectedFrequency = selectedLoanPlanDetails?.frequency || 'WEEKLY';
  const isMonthly = selectedFrequency === 'MONTHLY';
  const periodLabel = isMonthly ? 'Month' : 'Week';
  const periodLabelLower = isMonthly ? 'month' : 'week';

  const remaining = Math.max(Number(weeklyAmountValue || 0) - Number(amountPaidValue || 0), 0);
  const extra = Math.max(Number(amountPaidValue || 0) - Number(weeklyAmountValue || 0), 0);

  // Live preview shown under the Interest (%) field so the admin can see how
  // a typical collection would split into Interest + Principal before saving.
  // Formula: Interest per payment = ((Loan Amount * Interest %) / 100) / 12
  // — a fixed amount per payment based on the loan amount, not the amount paid.
  const selectedLoanAmount = selectedLoanPlanDetails?.loanAmount ?? 0;
  const formatCurrencyPreview = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const interestPreview = ((Number(selectedLoanAmount) * Number(interestPercentageValue || 0)) / 100) / 12;
  const principalPreview = Math.max(Number(weeklyAmountValue || 0) - interestPreview, 0);

  useEffect(() => {
    if (open) {
      setHeadOptionsLoading(true);
      memberService.getHeadMembers()
        .then((heads) => setHeadOptions(heads || []))
        .catch(() => setHeadOptions([]))
        .finally(() => setHeadOptionsLoading(false));
    }
  }, [open]);

  // Staff dropdown data is admin-only — STAFF/VIEWER logins would get a 403
  // from /api/staff anyway, so skip the call entirely for them rather than
  // fetching something they can't use (and can't see).
  useEffect(() => {
    if (open && isAdmin) {
      setStaffOptionsLoading(true);
      staffService.list()
        .then((staff) => setStaffOptions(staff || []))
        .catch(() => setStaffOptions([]))
        .finally(() => setStaffOptionsLoading(false));
    }
  }, [open, isAdmin]);

  useEffect(() => {
    if (open) {
      setTab(0);
      setTabErrorMessage('');
      setPhoneMatches([]);
      setReloanSource(null);
      reset(member ? {
        memberCode: member.memberCode || '',
        name: member.name || '',
        headMember: member.headMember || false,
        headMemberId: member.headMemberId || '',
        centerPlace: member.centerPlace || '',
        groupId: member.groupId || '',
        groupName: member.groupName || '',
        phoneNumber: member.phoneNumber || '',
        alternatePhoneNumber: member.alternatePhoneNumber || '',
        address: member.address || '',
        aadhaarNumber: member.aadhaarNumber || '',
        panNumber: member.panNumber || '',
        voterId: member.voterId || '',
        smartCardNumber: member.smartCardNumber || '',
        bankName: member.bankName || '',
        bankAccountNumber: member.bankAccountNumber || '',
        chequeNumber: member.chequeNumber || '',
        nomineeName: member.nomineeName || '',
        nomineePhoneNumber: member.nomineePhoneNumber || '',
        nomineeRelation: member.nomineeRelation || '',
        nomineeAadhaar: member.nomineeAadhaar || '',
        nomineePan: member.nomineePan || '',
        nomineeVoterId: member.nomineeVoterId || '',
        nomineeGender: member.nomineeGender || '',
        loanPlan: LOAN_PLAN_OPTIONS.find((p) => p.loanAmount === Number(member.loanAmount)
          && (p.frequency === 'MONTHLY' ? p.monthlyAmount : p.weeklyAmount) === Number(member.weeklyAmount)
        )?.id || '',
        weeklyAmount: member.weeklyAmount || '',
        joinDate: member.joinDate || todayIso(),
        weekday: member.weekday || '',
        notes: member.notes || '',
        marriageStatus: member.marriageStatus || '',
        gender: member.gender || '',
        dateOfBirth: member.dateOfBirth || '',
        house: member.house || '',
        fatherOrHusbandRelation: member.fatherOrHusbandRelation || 'FATHER',
        fatherOrHusbandName: member.fatherOrHusbandName || '',
        purposeOfLoan: member.purposeOfLoan || '',
        insuranceAmount: member.insuranceAmount ?? '',
        processingAmount: member.processingAmount ?? '',
        interestPercentage: member.interestPercentage ?? '',
        staffMemberId: member.staffMemberId || '',
        addInitialPayment: false,
        weekNumber: isoWeekNumber(), paymentYear: isoWeekYear(),
        amountPaid: '', paymentDate: todayIso(),
        paymentMethod: 'CASH', upiTransactionId: '', remarks: '',
      } : emptyValues);
    }
  }, [open, member, reset]);

  // Looks up existing members by phone number (skipped while a reloan source
  // is already applied, since that match is expected on purpose). The backend
  // returns every profile with this number regardless of status — active ones
  // block submission, closed ones can be picked to start a new loan.
  const checkPhoneNumber = async (rawPhone) => {
    const trimmed = (rawPhone || '').trim();
    if (!PHONE_PATTERN.test(trimmed) || reloanSource) {
      setPhoneMatches([]);
      return;
    }
    setPhoneChecking(true);
    try {
      const matches = await memberService.checkPhoneNumber(trimmed);
      setPhoneMatches(matches || []);
    } catch {
      setPhoneMatches([]);
    } finally {
      setPhoneChecking(false);
    }
  };

  // Pre-fills personal/document/bank/nominee info from the matched (CLOSED)
  // member. Member ID, loan plan, weekly amount, join date, notes, and
  // charges are deliberately left blank — this is a fresh loan cycle. The new
  // profile is added as a regular sub-member under the same head as the original.
  const applyReloan = (candidate) => {
    const resolvedHeadId = candidate.headMember ? candidate.id : candidate.headMemberId;
    setReloanSource(candidate);
    setPhoneMatches([]);
    reset({
      ...emptyValues,
      name: candidate.name || '',
      headMember: false,
      headMemberId: resolvedHeadId || '',
      centerPlace: candidate.centerPlace || '',
      groupId: candidate.groupId || '',
      groupName: candidate.groupName || '',
      phoneNumber: candidate.phoneNumber || '',
      alternatePhoneNumber: candidate.alternatePhoneNumber || '',
      address: candidate.address || '',
      aadhaarNumber: candidate.aadhaarNumber || '',
      panNumber: candidate.panNumber || '',
      voterId: candidate.voterId || '',
      smartCardNumber: candidate.smartCardNumber || '',
      bankName: candidate.bankName || '',
      bankAccountNumber: candidate.bankAccountNumber || '',
      chequeNumber: candidate.chequeNumber || '',
      nomineeName: candidate.nomineeName || '',
      nomineePhoneNumber: candidate.nomineePhoneNumber || '',
      nomineeRelation: candidate.nomineeRelation || '',
      nomineeAadhaar: candidate.nomineeAadhaar || '',
      nomineePan: candidate.nomineePan || '',
      nomineeVoterId: candidate.nomineeVoterId || '',
      nomineeGender: candidate.nomineeGender || '',
      weekday: candidate.weekday || '',
      joinDate: todayIso(),
      marriageStatus: candidate.marriageStatus || '',
      gender: candidate.gender || '',
      dateOfBirth: candidate.dateOfBirth || '',
      house: candidate.house || '',
      fatherOrHusbandRelation: candidate.fatherOrHusbandRelation || 'FATHER',
      fatherOrHusbandName: candidate.fatherOrHusbandName || '',
      // Purpose of loan is intentionally left blank — a new loan cycle likely
      // has a different purpose than the one it's replacing.
    });
    setTab(0);
  };

  const cancelReloan = () => {
    setReloanSource(null);
    setPhoneMatches([]);
    reset(emptyValues);
  };

  const submitHandler = (values) => {
    const memberData = {
      memberCode: values.memberCode,
      name: values.name,
      headMember: values.headMember,
      headMemberId: values.headMember ? null : (values.headMemberId || null),
      centerPlace: values.centerPlace,
      groupId: values.groupId,
      groupName: values.groupName,
      phoneNumber: values.phoneNumber,
      alternatePhoneNumber: values.alternatePhoneNumber || null,
      address: values.address,
      aadhaarNumber: values.aadhaarNumber,
      panNumber: values.panNumber,
      voterId: values.voterId,
      smartCardNumber: values.smartCardNumber,
      bankName: values.bankName,
      bankAccountNumber: values.bankAccountNumber,
      chequeNumber: values.chequeNumber,
      nomineeName: values.nomineeName,
      nomineePhoneNumber: values.nomineePhoneNumber || null,
      nomineeRelation: values.nomineeRelation,
      nomineeAadhaar: values.nomineeAadhaar,
      nomineePan: values.nomineePan,
      nomineeVoterId: values.nomineeVoterId,
      nomineeGender: values.nomineeGender || null,
      weeklyAmount: Number(values.weeklyAmount),
      loanAmount: LOAN_PLAN_OPTIONS.find((p) => p.id === values.loanPlan)?.loanAmount ?? null,
      paymentFrequency: LOAN_PLAN_OPTIONS.find((p) => p.id === values.loanPlan)?.frequency ?? 'WEEKLY',
      totalWeeks: LOAN_PLAN_OPTIONS.find((p) => p.id === values.loanPlan)?.totalWeeks ?? null,
      interestPercentage: values.interestPercentage === '' ? 0 : Number(values.interestPercentage),
      joinDate: values.joinDate,
      weekday: values.weekday,
      notes: values.notes,
      marriageStatus: values.marriageStatus || null,
      gender: values.gender || null,
      dateOfBirth: values.dateOfBirth || null,
      house: values.house || null,
      fatherOrHusbandRelation: values.fatherOrHusbandName ? values.fatherOrHusbandRelation : null,
      fatherOrHusbandName: values.fatherOrHusbandName || null,
      purposeOfLoan: values.purposeOfLoan || null,
      insuranceAmount: values.insuranceAmount === '' ? 0 : Number(values.insuranceAmount),
      processingAmount: values.processingAmount === '' ? 0 : Number(values.processingAmount),
      // Only ever sent for admins. STAFF/VIEWER can't render or change this
      // field, so their payload must omit it entirely — MemberServiceImpl on
      // the backend treats a missing/null staffMemberId as "leave unchanged"
      // on update, so omitting it here is what keeps a non-admin edit from
      // wiping out an existing assignment.
      ...(isAdmin ? { staffMemberId: values.staffMemberId || null } : {}),
    };

    const paymentData = (!isEdit && values.addInitialPayment) ? {
      weekNumber: Number(values.weekNumber),
      paymentYear: Number(values.paymentYear),
      amountPaid: Number(values.amountPaid),
      paymentDate: values.paymentDate,
      paymentMethod: values.paymentMethod,
      upiTransactionId: values.paymentMethod === 'ONLINE' ? values.upiTransactionId : null,
      remarks: values.remarks,
    } : null;

    setTabErrorMessage('');
    onSubmit({ member: memberData, payment: paymentData });
  };

  // Fires when Save is clicked but validation fails somewhere — including on
  // a tab that isn't currently visible, which would otherwise fail silently.
  const onInvalid = (formErrors) => {
    const firstErrorField = Object.keys(formErrors)[0];
    const targetTab = FIELD_TAB_MAP[firstErrorField] ?? 0;
    setTab(targetTab);
    setTabErrorMessage(`Please check the highlighted field${Object.keys(formErrors).length > 1 ? 's' : ''} on the "${TAB_LABELS[targetTab]}" tab.`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        {isEdit ? `Edit member — ${member?.name}` : 'Create member'}
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit(submitHandler, onInvalid)} noValidate>
        <DialogContent dividers sx={{ pt: 0 }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setTabErrorMessage(''); }} sx={{ mb: 1 }}>
            <Tab label="Personal Info" />
            <Tab label="Documents" />
            <Tab label="Bank Details" />
            <Tab label="Nominee" />
            <Tab label="Insurance & Processing" />
            {!isEdit && <Tab label="Initial Payment" />}
          </Tabs>

          {tabErrorMessage && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setTabErrorMessage('')}>
              {tabErrorMessage}
            </Alert>
          )}

          {/* ── Tab 0: Personal Info ─────────────────────────────── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2">Head Member?</Typography>
                  <Controller
                    name="headMember"
                    control={control}
                    render={({ field }) => (
                      <ToggleButtonGroup
                        exclusive size="small"
                        value={field.value ? 'yes' : 'no'}
                        onChange={(_, v) => v && field.onChange(v === 'yes')}
                      >
                        <ToggleButton value="yes">Yes</ToggleButton>
                        <ToggleButton value="no">No</ToggleButton>
                      </ToggleButtonGroup>
                    )}
                  />
                  {watch('headMember') && (
                    <Chip label="HEAD MEMBER" color="warning" size="small" />
                  )}
                </Box>
              </Grid>

              {!watch('headMember') && (
                <Grid size={12}>
                  <Controller
                    name="headMemberId"
                    control={control}
                    rules={{ required: 'Please select the head member this member belongs to' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="Head Member (group) *"
                        error={Boolean(errors.headMemberId)}
                        helperText={errors.headMemberId?.message
                          || (headOptions.length === 0 && !headOptionsLoading
                            ? 'No head members exist yet — create one first'
                            : '')}
                        disabled={headOptionsLoading}
                        onChange={(e) => {
                          field.onChange(e);
                          const selectedHead = headOptions.find((h) => h.id === e.target.value);
                          if (selectedHead?.centerPlace) {
                            setValue('centerPlace', selectedHead.centerPlace, { shouldValidate: true, shouldDirty: true });
                          }
                          setValue('groupId', selectedHead?.groupId, { shouldValidate: true, shouldDirty: true });
                          setValue('groupName', selectedHead?.groupName, { shouldValidate: true, shouldDirty: true });
                        }}
                      >
                        {headOptions
                          .filter((h) => !isEdit || h.id !== member?.id)
                          .map((h) => (
                            <MenuItem key={h.id} value={h.id}>
                              {h.name} ({h.memberCode}){h.centerPlace ? ` — ${h.centerPlace}` : ''}
                            </MenuItem>
                          ))}
                      </TextField>
                    )}
                  />
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Member ID *" error={Boolean(errors.memberCode)}
                  helperText={errors.memberCode?.message || (isEdit ? 'Cannot be changed after creation' : '')}
                  disabled={isEdit}
                  {...register('memberCode', {
                    required: 'Member ID is required',
                    maxLength: { value: 20, message: 'Max 20 chars' },
                    pattern: { value: /^[A-Za-z0-9_-]+$/, message: 'Letters, numbers, hyphens, underscores only' },
                  })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField fullWidth label="Member Name *" error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                  {...register('name', {
                    required: 'Member name is required',
                    maxLength: { value: 100, message: 'Max 100 chars' },
                  })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="fatherOrHusbandRelation"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="Relation">
                      <MenuItem value="FATHER">Father</MenuItem>
                      <MenuItem value="HUSBAND">Husband</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  label={watch('fatherOrHusbandRelation') === 'HUSBAND' ? "Husband's Name" : "Father's Name"}
                  {...register('fatherOrHusbandName')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="centerPlace"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Center Place" />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="groupId"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Group ID" />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="groupName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label="Group Name" />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="Gender">
                      <MenuItem value="">
                        <em>Not specified</em>
                      </MenuItem>
                      <MenuItem value="MALE">Male</MenuItem>
                      <MenuItem value="FEMALE">Female</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Phone Number *" error={Boolean(errors.phoneNumber)}
                  helperText={errors.phoneNumber?.message}
                  {...register('phoneNumber', {
                    required: 'Phone number is required',
                    pattern: { value: PHONE_PATTERN, message: 'Enter valid 10-digit number' },
                    onBlur: (e) => { if (!isEdit) checkPhoneNumber(e.target.value); },
                  })}
                  slotProps={{
                    input: {
                      endAdornment: phoneChecking ? (
                        <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
                      ) : undefined,
                    },
                  }}
                />
              </Grid>

              {!isEdit && phoneActiveDuplicate && (
                <Grid size={12}>
                  <Alert severity="error">
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      This phone number already belongs to a member whose loan is still open. A new profile can
                      only be created once their existing loan is closed.
                    </Typography>
                    <Stack spacing={1}>
                      {activePhoneMatches.map((m) => (
                        <Stack key={m.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <StatusChip status={m.status} />
                          <Typography variant="body2">{m.name} ({m.memberCode})</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Alert>
                </Grid>
              )}

              {!isEdit && !reloanSource && !phoneActiveDuplicate && closedPhoneMatches.length > 0 && (
                <Grid size={12}>
                  <Alert severity="info" onClose={() => setPhoneMatches([])}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {closedPhoneMatches.length === 1
                        ? 'This phone number belongs to a member whose loan is closed.'
                        : `This phone number belongs to ${closedPhoneMatches.length} members whose loans are closed.`}
                      {' '}Start a new loan for them?
                    </Typography>
                    <Stack spacing={1}>
                      {closedPhoneMatches.map((c) => (
                        <Stack key={c.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <StatusChip status={c.status} />
                          <Button size="small" variant="outlined" onClick={() => applyReloan(c)}>
                            New loan for {c.name} ({c.memberCode}{c.groupId ? ` · ${c.groupId}` : ''})
                          </Button>
                        </Stack>
                      ))}
                      <Button size="small" color="inherit" onClick={() => setPhoneMatches([])} sx={{ alignSelf: 'flex-start' }}>
                        Not them, continue as new member
                      </Button>
                    </Stack>
                  </Alert>
                </Grid>
              )}

              {!isEdit && reloanSource && (
                <Grid size={12}>
                  <Alert severity="success" onClose={cancelReloan}>
                    New loan — personal, document, bank, and nominee details were pre-filled from{' '}
                    <strong>{reloanSource.name}</strong> ({reloanSource.memberCode}, <StatusChip status="CLOSED" />).
                    Set a new Member ID and loan plan below; this saves as a new profile under the same head member,
                    not an edit of the original.
                  </Alert>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Alternate Phone Number" error={Boolean(errors.alternatePhoneNumber)}
                  helperText={errors.alternatePhoneNumber?.message || ''}
                  {...register('alternatePhoneNumber', {
                    validate: (v) => !v || PHONE_PATTERN.test(v) || 'Enter valid 10-digit number',
                  })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="loanPlan"
                  control={control}
                  rules={{ required: 'Loan plan is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Loan Plan *"
                      error={Boolean(errors.loanPlan)}
                      helperText={errors.loanPlan?.message}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        field.onChange(selectedId);
                        const plan = LOAN_PLAN_OPTIONS.find((p) => p.id === selectedId);
                        if (plan) {
                          const installment = plan.frequency === 'MONTHLY' ? plan.monthlyAmount : plan.weeklyAmount;
                          setValue('weeklyAmount', installment, { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                    >
                      {LOAN_PLAN_OPTIONS.map((plan) => (
                        <MenuItem key={plan.id} value={plan.id}>
                          ₹{plan.loanAmount.toLocaleString('en-IN')} — ₹{(plan.frequency === 'MONTHLY' ? plan.monthlyAmount : plan.weeklyAmount).toLocaleString('en-IN')}/{plan.frequency === 'MONTHLY' ? 'month' : 'week'}
                          {plan.totalWeeks ? ` · ${plan.totalWeeks} weeks` : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="weeklyAmount"
                  control={control}
                  rules={{ required: `Select a loan plan to set the ${periodLabelLower}ly amount` }}
                  render={({ field }) => (
                    <TextField {...field} fullWidth label={`${periodLabel}ly Fixed Amount *`}
                      slotProps={{
                        input: {
                          readOnly: true,
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        },
                      }}
                      error={Boolean(errors.weeklyAmount)}
                      helperText={errors.weeklyAmount?.message || ''} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Purpose of Loan" {...register('purposeOfLoan')} />
              </Grid>

              <Grid size={12}>
                <TextField fullWidth label="Address *" multiline minRows={2}
                  error={Boolean(errors.address)} helperText={errors.address?.message}
                  {...register('address', { required: 'Address is required' })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth type="date" label="Join Date *"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.joinDate)} helperText={errors.joinDate?.message}
                  {...register('joinDate', { required: 'Join date is required' })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="weekday"
                  control={control}
                  rules={{ required: 'Weekday is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      fullWidth
                      label="Weekday *"
                      error={Boolean(errors.weekday)}
                      helperText={errors.weekday?.message}
                    >
                      {WEEKDAY_OPTIONS.map((day) => (
                        <MenuItem key={day} value={day}>{weekdayLabel(day)}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              {isAdmin && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="staffMemberId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        label="Staff Member"
                        disabled={staffOptionsLoading}
                        helperText={staffOptionsLoading ? 'Loading staff...' : ''}
                        slotProps={{
                          input: {
                            endAdornment: staffOptionsLoading ? (
                              <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
                            ) : undefined,
                          },
                        }}
                      >
                        <MenuItem value="">None</MenuItem>
                        {staffOptions.map((staff) => (
                          <MenuItem key={staff.id} value={staff.id}>
                            {staff.name}{staff.place ? ` · ${staff.place}` : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="marriageStatus"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="Marriage Status">
                      <MenuItem value="">
                        <em>Not specified</em>
                      </MenuItem>
                      <MenuItem value="SINGLE">Single</MenuItem>
                      <MenuItem value="MARRIED">Married</MenuItem>
                      <MenuItem value="DIVORCED">Divorced</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth type="date" label="Date of Birth"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.dateOfBirth)} helperText={errors.dateOfBirth?.message}
                  {...register('dateOfBirth')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="house"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="House">
                      <MenuItem value="">
                        <em>Not specified</em>
                      </MenuItem>
                      <MenuItem value="OWN">Own</MenuItem>
                      <MenuItem value="RENT">Rent</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth label="Notes" multiline minRows={2} {...register('notes')} />
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 1: Documents ────────────────────────────────────── */}
          <TabPanel value={tab} index={1}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Aadhaar Number" {...register('aadhaarNumber')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="PAN Card Number" {...register('panNumber')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Voter ID" {...register('voterId')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Smart Card Number" {...register('smartCardNumber')} />
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 2: Bank Details ──────────────────────────────────── */}
          <TabPanel value={tab} index={2}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField fullWidth label="Bank Name" {...register('bankName')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Account Number" {...register('bankAccountNumber')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Cheque Number" error={Boolean(errors.chequeNumber)}
                  helperText={errors.chequeNumber?.message}
                  {...register('chequeNumber', {
                    pattern: { value: /^\d{6,7}$/, message: 'Must be 6-7 digits' },
                  })} />
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 3: Nominee ───────────────────────────────────────── */}
          <TabPanel value={tab} index={3}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Nominee Name" {...register('nomineeName')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Nominee Phone Number" error={Boolean(errors.nomineePhoneNumber)}
                  helperText={errors.nomineePhoneNumber?.message}
                  {...register('nomineePhoneNumber', {
                    validate: (v) => !v || PHONE_PATTERN.test(v) || 'Enter valid 10-digit number',
                  })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Relation" {...register('nomineeRelation')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="nomineeGender"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} select fullWidth label="Gender">
                      <MenuItem value="">
                        <em>Not specified</em>
                      </MenuItem>
                      <MenuItem value="MALE">Male</MenuItem>
                      <MenuItem value="FEMALE">Female</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Nominee Aadhaar" {...register('nomineeAadhaar')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Nominee PAN" {...register('nomineePan')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Nominee Voter ID" {...register('nomineeVoterId')} />
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 4: Insurance, Processing & Interest (always visible — create and edit) ── */}
          <TabPanel value={tab} index={4}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="insuranceAmount"
                  control={control}
                  rules={{ validate: (v) => v === '' || Number(v) >= 0 || 'Cannot be negative' }}
                  render={({ field }) => (
                    <TextField {...field} fullWidth type="number" label="Insurance Amount"
                      error={Boolean(errors.insuranceAmount)}
                      helperText={errors.insuranceAmount?.message || ''}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="processingAmount"
                  control={control}
                  rules={{ validate: (v) => v === '' || Number(v) >= 0 || 'Cannot be negative' }}
                  render={({ field }) => (
                    <TextField {...field} fullWidth type="number" label="Processing Amount"
                      error={Boolean(errors.processingAmount)}
                      helperText={errors.processingAmount?.message || ''}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
                  )}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Tab 5: Initial Payment (create only) ────────────────── */}
          {!isEdit && (
            <TabPanel value={tab} index={5}>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2">Record an initial payment now?</Typography>
                    <Controller
                      name="addInitialPayment"
                      control={control}
                      render={({ field }) => (
                        <ToggleButtonGroup exclusive size="small"
                          value={field.value ? 'yes' : 'no'}
                          onChange={(_, v) => v && field.onChange(v === 'yes')}
                        >
                          <ToggleButton value="yes">Yes</ToggleButton>
                          <ToggleButton value="no">No</ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    />
                  </Box>
                </Grid>

                {addInitialPayment && (
                  <>
                    {weeklyAmountValue && (
                      <Grid size={12}>
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          {periodLabel}ly amount: <strong>₹{weeklyAmountValue}</strong>
                          {remaining > 0 && ` · Remaining: ₹${remaining}`}
                          {extra > 0 && ` · Credit balance: ₹${extra}`}
                          {remaining === 0 && Number(amountPaidValue) > 0 && ' · ✓ Fully paid'}
                        </Alert>
                      </Grid>
                    )}
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField fullWidth type="number" label={`${periodLabel} #`}
                        error={Boolean(errors.weekNumber)}
                        helperText={errors.weekNumber?.message}
                        {...register('weekNumber', {
                          required: addInitialPayment ? 'Required' : false,
                          min: { value: 1, message: isMonthly ? '1-12' : '1-53' },
                          max: { value: isMonthly ? 12 : 53, message: isMonthly ? '1-12' : '1-53' },
                        })} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <TextField fullWidth type="number" label="Year"
                        error={Boolean(errors.paymentYear)}
                        helperText={errors.paymentYear?.message}
                        {...register('paymentYear', {
                          required: addInitialPayment ? 'Required' : false,
                          min: { value: 2000, message: 'Invalid year' },
                        })} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Controller
                        name="amountPaid"
                        control={control}
                        rules={{
                          required: addInitialPayment ? 'Amount is required' : false,
                          validate: (v) => !addInitialPayment || Number(v) > 0 || 'Must be greater than zero',
                        }}
                        render={({ field }) => (
                          <TextField {...field} fullWidth type="number" label="Amount Paid *"
                            error={Boolean(errors.amountPaid)} helperText={errors.amountPaid?.message}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth type="date" label="Payment Date *"
                        slotProps={{ inputLabel: { shrink: true } }}
                        error={Boolean(errors.paymentDate)}
                        {...register('paymentDate', { required: addInitialPayment ? 'Required' : false })} />
                    </Grid>
                    <Grid size={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Payment Method
                      </Typography>
                      <Controller
                        name="paymentMethod"
                        control={control}
                        render={({ field }) => (
                          <ToggleButtonGroup {...field} exclusive fullWidth
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
                        <TextField fullWidth label="UPI Transaction ID *"
                          error={Boolean(errors.upiTransactionId)}
                          helperText={errors.upiTransactionId?.message}
                          {...register('upiTransactionId', {
                            required: paymentMethod === 'ONLINE' ? 'UPI Transaction ID is required' : false,
                          })} />
                      </Grid>
                    )}
                    <Grid size={12}>
                      <TextField fullWidth label="Remarks" multiline minRows={2} {...register('remarks')} />
                    </Grid>
                  </>
                )}
              </Grid>
            </TabPanel>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
          {tab > 0 && (
            <Button type="button" onClick={() => { setTab((t) => t - 1); setTabErrorMessage(''); }} disabled={submitting}>Back</Button>
          )}
          {tab < lastTabIndex ? (
            <Button key="next-btn" type="button" variant="contained"
              onClick={(e) => { e.currentTarget.blur(); setTab((t) => t + 1); setTabErrorMessage(''); }}>
              Next
            </Button>
          ) : (
            <Button key="save-btn" type="submit" variant="contained" disabled={submitting || phoneActiveDuplicate}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}>
              {isEdit ? 'Save changes' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
