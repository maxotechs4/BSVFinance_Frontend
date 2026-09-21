import { Chip } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import QrCode2Icon from '@mui/icons-material/QrCode2';

export default function PaymentMethodBadge({ method }) {
  if (method === 'ONLINE') {
    return <Chip icon={<QrCode2Icon />} label="Online" size="small" color="info" variant="outlined" />;
  }
  return <Chip icon={<PaymentsIcon />} label="Cash" size="small" color="default" variant="outlined" />;
}
