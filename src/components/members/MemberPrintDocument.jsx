import { Box, Typography, GlobalStyles } from '@mui/material';
import logo from '../../assets/logo.webp';
import { formatCurrency, formatDate } from '../../utils/formatters';

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
                p: '5px 10px',
        borderRight: last ? 'none' : BORDER,
      }}
    >
      <Typography
        sx={{
          fontSize: 8.5,
          color: LABEL_COLOR,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          lineHeight: 1.1,
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 500,
          wordBreak: 'break-word',
          lineHeight: 1.25,
          mt: 0.15,
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

// ---------- Loan / EMI repayment schedule ----------
// Mirrors the printed "Loan Card / Repayment Schedule - Group-wise" sheet:
// a details header (branch, group, officer, amount, dates, rate) followed
// by a 23-row-style EMI demand vs. collection grid.
//
// Expects member.loanSchedule as an array of:
// {
//   installmentNo, demandDate,
//   demandPrincipal, demandInterest, demandTotal,
//   collectedPrincipal, collectedInterest, collectedTotal,
//   collectionDate, receiptNo,
// }
const SCHEDULE_BORDER = '1px solid #999';

function ScheduleHeaderCell({ children, wide, colSpanCells = 1, flexOverride }) {
  return (
    <Box
      sx={{
        flex: flexOverride ?? (wide ? 2 * colSpanCells : colSpanCells),
        minWidth: 0,
        border: SCHEDULE_BORDER,
        borderLeft: 'none',
        borderTop: 'none',
        p: '4px 3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontSize: 8.5, fontWeight: 700, lineHeight: 1.15 }}>
        {children}
      </Typography>
    </Box>
  );
}

function ScheduleCell({ children, wide, align = 'center' }) {
  return (
    <Box
      sx={{
        flex: wide ? 2 : 1,
        minWidth: 0,
        border: SCHEDULE_BORDER,
        borderLeft: 'none',
        borderTop: 'none',
        p: '3px 4px',
        textAlign: align,
      }}
    >
      <Typography sx={{ fontSize: 9, lineHeight: 1.2 }}>{children ?? ''}</Typography>
    </Box>
  );
}

function LoanScheduleTable({ schedule, totalLoanAmount }) {
  const rows = (schedule || []).slice(0, 16);

  const loanAmount = Number(totalLoanAmount) || 0;
  const weeklyPrincipal = rows.length ? loanAmount / rows.length : 0;

  return (
    <Box sx={{ border: SCHEDULE_BORDER, borderRight: 'none', borderBottom: 'none', mt: 0.5 }}>
      {/* Group header: EMI Demand vs EMI Collection */}
      <Box sx={{ display: 'flex' }}>
        <ScheduleHeaderCell>S.No</ScheduleHeaderCell>
        <ScheduleHeaderCell flexOverride={4}>EMI Demand</ScheduleHeaderCell>
        <ScheduleHeaderCell wide>Collection Date</ScheduleHeaderCell>
        <ScheduleHeaderCell>Receipt No</ScheduleHeaderCell>
        <ScheduleHeaderCell wide>Officer Signature</ScheduleHeaderCell>
      </Box>
      {/* Column header row */}
      <Box sx={{ display: 'flex' }}>
        <ScheduleHeaderCell>{''}</ScheduleHeaderCell>
        <ScheduleHeaderCell wide>Demand Date</ScheduleHeaderCell>
        <ScheduleHeaderCell>Principal</ScheduleHeaderCell>
        <ScheduleHeaderCell>Balance</ScheduleHeaderCell>
        <ScheduleHeaderCell wide>{''}</ScheduleHeaderCell>
        <ScheduleHeaderCell>{''}</ScheduleHeaderCell>
        <ScheduleHeaderCell wide>{''}</ScheduleHeaderCell>
      </Box>

            {rows.map((r, i) => {
        // Last row is forced to exactly 0 to avoid floating-point remainder.
        const balance = i === rows.length - 1
          ? 0
          : loanAmount - weeklyPrincipal * (i + 1);

        return (
          <Box key={r.installmentNo ?? i} sx={{ display: 'flex' }}>
            <ScheduleCell>{r.installmentNo ?? i + 1}</ScheduleCell>
            <ScheduleCell wide>{formatDate(r.demandDate)}</ScheduleCell>
            <ScheduleCell align="right">{formatCurrency(weeklyPrincipal)}</ScheduleCell>
            <ScheduleCell align="right">{formatCurrency(balance)}</ScheduleCell>
            <ScheduleCell wide>{''}</ScheduleCell>
            <ScheduleCell>{''}</ScheduleCell>
            <ScheduleCell wide>{''}</ScheduleCell>
          </Box>
        );
      })}

      {/* Totals row */}    
            {/* Totals row */}    
      <Box sx={{ display: 'flex' }}>
        <ScheduleCell wide align="right">Total:</ScheduleCell>
        <ScheduleCell>{''}</ScheduleCell>
        <ScheduleCell align="right">{formatCurrency(weeklyPrincipal * rows.length)}</ScheduleCell>
        <ScheduleCell align="right">{''}</ScheduleCell>
        <ScheduleCell wide>{''}</ScheduleCell>
        <ScheduleCell>{''}</ScheduleCell>
        <ScheduleCell wide>{''}</ScheduleCell>
      </Box>
    </Box>
  );
}

export default function MemberPrintDocument({ member, photoUrl }) {
  if (!member) return null;

  const hasLoanSchedule = Array.isArray(member.loanSchedule) && member.loanSchedule.length > 0;

  return (
    <Box className="print-doc" sx={{ maxWidth: '760px', mx: 'auto', p: 2, fontFamily: 'inherit' }}>
      <PrintPageSetup />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, pb: 1.5, borderBottom: '2px solid #222' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: 100 }}>
          <Box component="img" src={logo} alt="BSV Finance logo" sx={{ width: 54, height: 54, objectFit: 'contain', flexShrink: 0 }} />
          <Typography className="print-doc-accent-teal" sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, lineHeight: 1.2 }}>
            FINANCE
          </Typography>
        </Box>

        <Box sx={{ flex: 1, textAlign: 'center', pt: 0.5 }}>
          <Typography className="print-doc-accent-red" sx={{ fontSize: 24, fontWeight: 700, fontFamily: 'serif', lineHeight: 1.15 }}>
            BSV FINANCE
          </Typography>
          <Typography sx={{ fontSize: 10, color: LABEL_COLOR, mt: 0.5 }}>
            23/17D, Jonah Complex, Sinclair Street, Marthandam. PIN-629167
          </Typography>
        </Box>

        {/* Member's passport-size photo, top-right corner of the header */}
        <Box
          sx={{
            width: 90,
            height: 100,
            flexShrink: 0,
            border: '1px solid #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            bgcolor: '#fafafa',
          }}
        >
          {photoUrl ? (
            <Box
              component="img"
              src={photoUrl}
              alt={`${member.name}'s photo`}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ fontSize: 8, color: LABEL_COLOR, textAlign: 'center', px: 0.5 }}>
              Photo
            </Typography>
          )}
        </Box>
      </Box>

      {/* Loan details */}
      {hasLoanSchedule && (
        <>
          <SectionTitle>Loan Card / Repayment Schedule - Group-wise</SectionTitle>

          <Box sx={{ border: BORDER, borderRadius: 1.5, overflow: 'hidden', mt: 1 }}>
            <Row cells={[
              { label: 'Branch Name', value: 'Marthandam' },
              { label: 'Place Name', value: member.centerPlace },
            ]} />
            <Row cells={[
              { label: 'Head Member Name', value: member.headMember ? member.name : member.headMemberName },
              { label: 'Group ID', value: member.groupId },
            ]} />
            <Row cells={[
              { label: 'Group Name', value: member.groupName },
              { label: 'Member Name', value: member.name },
            ]} />
            <Row cells={[
              { label: 'Term Period', value: ''},
              { label: 'Due Date', value: member.joinDate ? Number(member.joinDate.split('-')[2]) : '' },
            ]} />
            <Row cells={[
              { label: 'Repayment Date', value: formatDate(member.joinDate) },
              { label: 'Loan Staff Name', value: member.staffMemberName },
            ]} />
            <Row cells={[
              { label: 'Total Amount', value: formatCurrency(member.loanAmount) },
              { label: 'Resource Date', value: '' },
            ]} />
            <Row cells={[
              { label: 'Type of Loan', value: '' },
              { label: 'Interest Rate (% p.a.)', value: member.interestPercentage },
            ]} />
           
          </Box>

          <LoanScheduleTable schedule={member.loanSchedule} totalLoanAmount={member.loanAmount} />
        </>
      )}
    </Box>
  );
}