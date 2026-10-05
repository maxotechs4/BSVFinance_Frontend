import { Grid, Paper, Box, Typography } from '@mui/material';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import { formatCurrency } from '../../utils/formatters';
import { moneyFontFamily, brandColors } from '../../styles/theme';

// Shrinks the font as the amount gets longer so every digit stays visible
function getValueFontSize(value) {
  const length = String(value).length;
  if (length > 18) return '0.85rem';
  if (length > 15) return '0.95rem';
  if (length > 13) return '1.1rem';
  if (length > 11) return '1.25rem';
  return '1.5rem';
}

function Card({ icon: Icon, label, value, accent }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: brandColors.teal700,
          boxShadow: '0 2px 10px rgba(227,30,36,0.12)',
        },
      }}
    >
      {/* Logo-colored accent stripe: black + red */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: 34, height: 3, bgcolor: brandColors.teal900 }} />
      <Box sx={{ position: 'absolute', top: 0, left: 38, width: 12, height: 3, bgcolor: brandColors.teal700 }} />

      {/* Row 1: icon + label */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
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
            border: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {label}
        </Typography>
      </Box>

      {/* Row 2: amount on its own line, full card width, never truncated */}
      <Typography
        variant="h5"
        sx={{
          fontFamily: moneyFontFamily,
          fontWeight: 500,
          mt: 1.5,
          fontSize: getValueFontSize(value),
          lineHeight: 1.3,
          whiteSpace: 'normal',
          overflow: 'visible',
          textOverflow: 'clip',
          overflowWrap: 'anywhere',
          color: accent || 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

export default function InsuranceProcessingSummaryCards({ summary }) {
  if (!summary) return null;

  const cards = [
    { icon: HowToRegRoundedIcon, label: 'Members paid', value: summary.membersPaidCount ?? 0 },
    { icon: HealthAndSafetyRoundedIcon, label: 'Total insurance collected', value: formatCurrency(summary.totalInsuranceCollected), accent: 'success.main' },
    { icon: ReceiptLongRoundedIcon, label: 'Total processing collected', value: formatCurrency(summary.totalProcessingCollected), accent: 'success.main' },
    { icon: AccountBalanceWalletRoundedIcon, label: 'Total insurance & processing collected', value: formatCurrency(summary.totalCollected), accent: 'success.main' },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card {...card} />
        </Grid>
      ))}
    </Grid>
  );
}