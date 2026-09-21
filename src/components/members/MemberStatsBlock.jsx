import { Box, Typography } from '@mui/material';
import { formatCurrency } from '../../utils/formatters';
import { moneyFontFamily } from '../../styles/theme';

function Stat({ label, value, color }) {
  return (
    <Box sx={{ textAlign: 'right', minWidth: { xs: 46, sm: 58 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, fontSize: { xs: '0.6rem', sm: '0.65rem' } }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: moneyFontFamily, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' }, color: color || 'text.primary' }}>
        {formatCurrency(value || 0)}
      </Typography>
    </Box>
  );
}

export default function MemberStatsBlock({ weeklyAmount, totalPaid, totalBalance }) {
  const balance = Number(totalBalance || 0);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 1.5 }, flexShrink: 0 }}>
      <Stat label="WEEKLY" value={weeklyAmount} />
      <Stat label="TOTAL PAID" value={totalPaid} color="success.main" />
      <Stat label="TOTAL BALANCE" value={totalBalance} color={balance > 0 ? 'error.main' : 'success.main'} />
    </Box>
  );
}