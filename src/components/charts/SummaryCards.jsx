import { Grid, Paper, Box, Typography } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import { formatCurrency } from '../../utils/formatters';
import { moneyFontFamily } from '../../styles/theme';

function Card({ icon: Icon, label, value, accent }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: 34, height: 3, bgcolor: 'primary.main' }} />
      <Box sx={{ position: 'absolute', top: 0, left: 38, width: 12, height: 3, bgcolor: 'secondary.main' }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            color: accent || 'text.secondary',
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {label}
          </Typography>
          <Typography variant="h5" noWrap sx={{ fontFamily: moneyFontFamily, fontWeight: 500, mt: 0.5, color: accent || 'text.primary' }}>
            {value}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  const cards = [
    { icon: GroupsRoundedIcon, label: 'Total members', value: summary.totalMembers ?? 0 },
    { icon: TrendingUpRoundedIcon, label: 'Total collection', value: formatCurrency(summary.totalCollectionAllTime), accent: 'success.main' },
    { icon: ReportRoundedIcon, label: 'Remaining due amount', value: formatCurrency(summary.totalOutstandingAllTime), accent: 'error.main' },
    { icon: PaymentsRoundedIcon, label: 'Total cash collection', value: formatCurrency(summary.cashCollection), accent: 'success.main' },
    { icon: QrCode2RoundedIcon, label: 'Total online collection', value: formatCurrency(summary.onlineCollection), accent: 'success.main' },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
          <Card {...card} />
        </Grid>
      ))}
    </Grid>
  );
}