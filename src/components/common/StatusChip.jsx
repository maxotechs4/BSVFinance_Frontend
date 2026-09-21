import { Chip } from '@mui/material';
import { STATUS_COLORS } from '../../utils/formatters';

// Statuses outside the normal payment-status set (PAID/PARTIAL/PENDING)
// get their own label/color here instead of the default title-casing.
const EXTRA_LABELS = { CLOSED: 'Loan Closed' };
const EXTRA_COLORS = { CLOSED: 'error' };

export default function StatusChip({ status, onClick }) {
  const color = EXTRA_COLORS[status] || STATUS_COLORS[status] || 'default';
  const label = EXTRA_LABELS[status] || (status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown');
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      sx={{ fontWeight: 500 }}
      onClick={onClick}
      clickable={Boolean(onClick)}
    />
  );
}
