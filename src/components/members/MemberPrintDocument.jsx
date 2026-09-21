import { Box, Typography, GlobalStyles } from '@mui/material';
import logo from '../../assets/logo.webp';
import { formatCurrency, formatDate, weekdayLabel } from '../../utils/formatters';

const BORDER = '1px solid #cfcfcf';
const LABEL_COLOR = '#6b6b6b';

function PrintPageSetup() {
  return (
    <GlobalStyles
      styles={{
        '@page': {
          size: 'A4 portrait',
          margin: '14mm 14mm',
        },
        '@media print': {
          'html, body': {
            margin: 0,
            padding: 0,
          },
        },
      }}
    />
  );
}

function Cell({ label, value, last }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        p: '9px 14px',
        borderRight: last ? 'none' : BORDER,
      }}
    >
      <Typography
        sx={{
          fontSize: 9.5,
          color: LABEL_COLOR,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          lineHeight: 1.2,
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 14.5,
          fontWeight: 500,
          wordBreak: 'break-word',
          lineHeight: 1.4,
          mt: 0.3,
        }}
      >
        {value || '-'}
      </Typography>
    </Box>
  );
}

function Row({ cells, lastRow }) {
  return (
    <Box sx={{ display: 'flex', borderBottom: lastRow ? 'none' : BORDER }}>
      {cells.map((cell, i) => (
        <Cell key={i} {...cell} last={i === cells.length - 1} />
      ))}
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.5, mb: 1 }}>
      <Box
        className="print-doc-accent-red"
        sx={{ width: 4, height: 16, bgcolor: 'currentColor', borderRadius: 0.5 }}
      />
      <Typography
        className="print-doc-accent-red"
        sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: 0.3 }}
      >
        {children}
      </Typography>
    </Box>
  );
}

// Renders a set of mutually-exclusive options (e.g. "Single / Married /
// Divorced") with a strikethrough over every option that does NOT match the
// selected value — mirroring how these are hand-struck on the paper form.
// If no value is set yet, nothing is struck through.
function StruckOptions({ options, value }) {
  return (
    <>
      {options.map((opt, i) => (
        <span key={opt.value}>
          {i > 0 && ' / '}
          <span style={{ textDecoration: value && value !== opt.value ? 'line-through' : 'none', opacity: value && value !== opt.value ? 0.45 : 1 }}>
            {opt.label}
          </span>
        </span>
      ))}
    </>
  );
}

const MARRIAGE_STATUS_OPTIONS = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
];

const HOUSE_OPTIONS = [
  { value: 'OWN', label: 'Own' },
  { value: 'RENT', label: 'Rent' },
];

export default function MemberPrintDocument({ member, photoUrl }) {
  if (!member) return null;

  const hasNominee = Boolean(member.nomineeName);

  // Most members don't have a separately recorded permanent address — default
  // to the current address (both boxes show the same text) unless a distinct
  // one has actually been entered.
  const permanentAddress = member.permanentAddress || member.address;

  // Father/Husband label follows whichever relation was chosen on the form.
  const fatherHusbandLabel =
    member.fatherOrHusbandRelation === 'HUSBAND' ? "Husband's Name"
      : member.fatherOrHusbandRelation === 'FATHER' ? "Father's Name"
      : 'Father / Husband';

  const isMonthly = member.paymentFrequency === 'MONTHLY';
  const installmentLabel = isMonthly ? 'Monthly Amount' : 'Weekly Amount';
  const termLabel = isMonthly ? 'Total Months' : 'Total Weeks';

  return (
    <Box className="print-doc" sx={{ maxWidth: '760px', mx: 'auto', p: 2, fontFamily: 'inherit' }}>
      <PrintPageSetup />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, pb: 1.5, borderBottom: '2px solid #222' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 100 }}>
          <Box component="img" src={logo} alt="Anbu Foundation logo" sx={{ width: 54, height: 54, objectFit: 'contain', flexShrink: 0 }} />
          <Typography className="print-doc-accent-teal" sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, lineHeight: 1.2 }}>
            FOUNDATION
          </Typography>
        </Box>

        <Box sx={{ flex: 1, textAlign: 'center', pt: 0.5 }}>
          <Typography className="print-doc-accent-red" sx={{ fontSize: 24, fontWeight: 700, fontFamily: 'serif', lineHeight: 1.15 }}>
            ANBU FOUNDATION
          </Typography>
          <Typography sx={{ fontSize: 10, color: LABEL_COLOR, mt: 0.5 }}>
            23/17D, Jonah Complex, Sinclair Street, Marthandam. PIN-629167
          </Typography>
        </Box>
      </Box>

      <Typography
        className="print-doc-accent-green"
        sx={{ fontSize: 16, fontWeight: 700, textAlign: 'center', mt: 2, mb: 1.5, letterSpacing: 0.5 }}
      >
        LOAN APPLICATION
      </Typography>

      {/* Personal details */}
      <Box sx={{ border: BORDER, borderRadius: 1.5, overflow: 'hidden' }}>
        <Row cells={[
          { label: 'Branch Name', value: '' },
          { label: 'Branch Number', value: '' },
          { label: 'Date', value: formatDate(new Date().toISOString()) },
        ]} />
        <Row cells={[
          { label: 'Customer I.D', value: member.memberCode },
          { label: 'Center No', value: member.centerCode },
          { label: 'Place', value: member.centerPlace },
        ]} />
        <Row cells={[
          { label: 'Full Name', value: member.name },
          { label: 'Head Member', value: member.headMember ? 'Yes' : 'No' },
        ]} />
        <Row cells={[
          { label: fatherHusbandLabel, value: member.fatherOrHusbandName },
        ]} />
        <Row cells={[
          { label: 'Gender', value: member.gender === 'MALE' ? 'Male' : member.gender === 'FEMALE' ? 'Female' : '-' },
          { label: 'Marriage Status', value: <StruckOptions options={MARRIAGE_STATUS_OPTIONS} value={member.marriageStatus} /> },
          { label: 'House', value: <StruckOptions options={HOUSE_OPTIONS} value={member.house} /> },
        ]} />
        <Row cells={[
          { label: 'Date of Birth', value: formatDate(member.dateOfBirth) },
          { label: 'Phone No.', value: member.phoneNumber },
          { label: 'Alternate Phone', value: member.alternatePhoneNumber },
        ]} />
        <Row cells={[
          { label: 'Weekday', value: member.weekday ? weekdayLabel(member.weekday) : '-' },
          { label: 'Join Date', value: formatDate(member.joinDate) },
        ]} />
        <Row cells={[
          { label: 'Aadhar No', value: member.aadhaarNumber },
          { label: 'PAN No', value: member.panNumber },
          { label: 'Voter ID', value: member.voterId },
        ]} />
        <Row cells={[
          { label: 'Smart Card No', value: member.smartCardNumber },
          { label: 'Purpose of Loan', value: member.purposeOfLoan },
        ]} />
        <Row cells={[
          { label: 'Address', value: member.address },
        ]} />
        <Row cells={[
          { label: 'Permanent Address', value: permanentAddress },
        ]} lastRow={!member.notes} />
        {member.notes && (
          <Row cells={[
            { label: 'Notes', value: member.notes },
          ]} lastRow />
        )}
      </Box>

      {/* Nominee details */}
      {hasNominee && (
        <>
          <SectionTitle>Nominee Details</SectionTitle>
          <Box sx={{ border: BORDER, borderRadius: 1.5, overflow: 'hidden' }}>
            <Row cells={[
              { label: 'Name', value: member.nomineeName },
              { label: 'Relationship', value: member.nomineeRelation },
              { label: 'Gender', value: member.nomineeGender === 'MALE' ? 'Male' : member.nomineeGender === 'FEMALE' ? 'Female' : '-' },
            ]} />
            <Row cells={[
              { label: 'Phone Number', value: member.nomineePhoneNumber },
              { label: 'Date of Birth', value: formatDate(member.nomineeDateOfBirth) },
            ]} />
            <Row cells={[
              { label: 'Aadhar No', value: member.nomineeAadhaar },
              { label: 'PAN No', value: member.nomineePan },
              { label: 'Voter ID', value: member.nomineeVoterId },
            ]} lastRow />
          </Box>
        </>
      )}
    </Box>
  );
}