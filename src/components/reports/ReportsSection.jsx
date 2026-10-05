import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  Autocomplete,
} from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import TableViewRoundedIcon from '@mui/icons-material/TableViewRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { reportService } from '../../services/reportService';
import { memberService } from '../../services/memberService';
import { extractErrorMessage } from '../../services/apiClient';
import { formatCurrency, formatDate, isoWeekNumber, isoWeekYear, MONTH_NAMES } from '../../utils/formatters';
import { moneyFontFamily } from '../../styles/theme';
import StatusChip from '../common/StatusChip';
import PaymentMethodBadge from '../common/PaymentMethodBadge';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ReportsSection() {
  const [tab, setTab] = useState('weekly');
  const [members, setMembers] = useState([]);

  const [filters, setFilters] = useState({
    weekNumber: isoWeekNumber(),
    year: isoWeekYear(),
    month: new Date().getMonth() + 1,
    memberId: null,
    method: '',
  });

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    memberService.list({ page: 0, size: 200 }).then((res) => setMembers(res.content)).catch(() => {});
  }, []);

  const runReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        memberId: filters.memberId || undefined,
        method: filters.method || undefined,
      };
      let data;
      if (tab === 'weekly') {
        data = await reportService.weekly({ ...params, weekNumber: filters.weekNumber, year: filters.year });
      } else if (tab === 'monthly') {
        data = await reportService.monthly({ ...params, month: filters.month, year: filters.year });
      } else {
        data = await reportService.yearly({ ...params, year: filters.year });
      }
      setReport(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReport();
  }, [tab]);

  const rows = report?.payments || [];
  const isYearly = tab === 'yearly';
  const yearlyRows = report?.monthlyBreakdown || [];
  const reportTitle = tab === 'weekly'
    ? `Week ${report?.weekNumber} / ${report?.year}`
    : tab === 'monthly'
      ? `${MONTH_NAMES[(report?.month || 1) - 1]} ${report?.year}`
      : `Year ${report?.year}`;

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Collection report - ${reportTitle}`, 14, 16);

    if (isYearly) {
      if (!yearlyRows.length) return;
      autoTable(doc, {
        startY: 22,
        head: [['Month', 'Total collection']],
        body: yearlyRows.map((m) => [MONTH_NAMES[m.month - 1], formatCurrency(m.totalCollection)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 67, 61] },
      });
    } else {
      if (!rows.length) return;
      autoTable(doc, {
        startY: 22,
        head: [['Receipt #', 'Member', 'Week', 'Paid', 'Remaining', 'Method', 'Date', 'Status']],
        body: rows.map((p) => [
          p.receiptNumber,
          p.memberName,
          `W${p.weekNumber}/${p.paymentYear}`,
          formatCurrency(p.amountPaid),
          formatCurrency(p.remainingAmount),
          p.paymentMethod,
          formatDate(p.paymentDate),
          p.status,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [21, 67, 61] },
      });
    }
    doc.save(`collection-report-${tab}.pdf`);
  };

  const handleExportExcel = () => {
    let data;
    if (isYearly) {
      if (!yearlyRows.length) return;
      data = yearlyRows.map((m) => ({ Month: MONTH_NAMES[m.month - 1], 'Total Collection': m.totalCollection }));
    } else {
      if (!rows.length) return;
      data = rows.map((p) => ({
        'Receipt #': p.receiptNumber,
        Member: p.memberName,
        Week: `W${p.weekNumber}/${p.paymentYear}`,
        'Weekly Amount': p.weeklyAmount,
        'Amount Paid': p.amountPaid,
        Remaining: p.remainingAmount,
        Method: p.paymentMethod,
        'Payment Date': p.paymentDate,
        Status: p.status,
      }));
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `collection-report-${tab}.xlsx`);
  };

  const handlePrint = () => window.print();

  return (
    <Box>
      <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          className="no-print"
          sx={{
            mb: 2,
            // underline under the active tab
            '& .MuiTabs-indicator': { bgcolor: '#47492ff8', height: 3 },
            // inactive tabs
            '& .MuiTab-root': {
              color: 'text.secondary',
              fontWeight: 500,
              '&:hover': { color: 'text.primary' },
            },
            // active tab (red in light mode, brighter red in dark mode so it stays visible)
            '& .MuiTab-root.Mui-selected': {
              color: (theme) => (theme.palette.mode === 'dark' ? '#dddfd5f8' : '#47492ff8'),
              fontWeight: 600,
            },
          }}
        >
        <Tab label="Weekly" value="weekly" />
        <Tab label="Monthly" value="monthly" />
        <Tab label="Yearly" value="yearly" />
      </Tabs>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }} className="no-print">
        <Grid container spacing={2} alignItems="center">
          {tab === 'weekly' && (
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Week #"
                value={filters.weekNumber}
                onChange={(e) => setFilters((f) => ({ ...f, weekNumber: Number(e.target.value) }))}
              />
            </Grid>
          )}
          {tab === 'monthly' && (
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Month"
                value={filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, month: Number(e.target.value) }))}
              >
                {MONTH_NAMES.map((m, idx) => (
                  <MenuItem key={m} value={idx + 1}>{m}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Year"
              value={filters.year}
              onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Autocomplete
              size="small"
              options={members}
              getOptionLabel={(m) => `${m.name} (${m.memberCode})`}
              onChange={(_, value) => setFilters((f) => ({ ...f, memberId: value?.id || null }))}
              renderInput={(params) => <TextField {...params} label="Member (optional)" />}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Method"
              value={filters.method}
              onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="ONLINE">Online</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <Button variant="contained" onClick={runReport} fullWidth>Apply</Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <LoadingSpinner label="Generating report..." />
      ) : report ? (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {reportTitle}
              </Typography>

              <Paper
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'inline-block',
                  minWidth: 220,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total Amount Collected
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    fontFamily: moneyFontFamily,
                    mt: 0.5,
                  }}
                >
                  {formatCurrency(report.totalCollection)}
                </Typography>
              </Paper>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Cash: {formatCurrency(report.cashCollection)}
                {' · '}
                Online: {formatCurrency(report.onlineCollection)}
                {' · '}
                Due: {formatCurrency(report.totalDue)}
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              className="no-print"
              sx={{ alignSelf: 'center' }}
            >
            <Button
              size="small"
              startIcon={<PictureAsPdfRoundedIcon />}
              onClick={handleExportPdf}
              sx={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#534e4e'
              }}
            >
              Export PDF
            </Button>

            <Button
              size="small"
              startIcon={<TableViewRoundedIcon />}
              onClick={handleExportExcel}
              sx={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#534e4e'
              }}
            >
              Export Excel
            </Button>

            <Button
              size="small"
              startIcon={<PrintRoundedIcon />}
              onClick={handlePrint}
              sx={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#534e4e'
              }}
            >
              Print
            </Button>
          </Stack>
          </Stack>

          <Paper variant="outlined">
            <TableContainer sx={{ overflowX: 'auto' }}>
              {isYearly ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell align="right">Total collection</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {yearlyRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">No payments in this year</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {yearlyRows.map((m) => (
                      <TableRow key={m.month} hover>
                        <TableCell>{MONTH_NAMES[m.month - 1]}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(m.totalCollection)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Receipt #</TableCell>
                      <TableCell>Member</TableCell>
                      <TableCell>Week</TableCell>
                      <TableCell align="right">Paid</TableCell>
                      <TableCell align="right">Remaining</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">No payments in this period</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ fontFamily: moneyFontFamily, fontSize: 12 }}>{p.receiptNumber}</TableCell>
                        <TableCell>{p.memberName}</TableCell>
                        <TableCell>W{p.weekNumber}/{p.paymentYear}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(p.amountPaid)}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>{formatCurrency(p.remainingAmount)}</TableCell>
                        <TableCell><PaymentMethodBadge method={p.paymentMethod} /></TableCell>
                        <TableCell>{formatDate(p.paymentDate)}</TableCell>
                        <TableCell><StatusChip status={p.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </Paper>
        </>
      ) : null}
    </Box>
  );
}