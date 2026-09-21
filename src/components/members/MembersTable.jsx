import {
  Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, TableSortLabel, IconButton, Tooltip,
  Box, Typography, Paper, Chip,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { moneyFontFamily } from '../../styles/theme';
import StatusChip from '../common/StatusChip';
import PaymentMethodBadge from '../common/PaymentMethodBadge';

const COLUMNS = [
  { id: 'memberCode', label: 'Member ID', sortable: false },
  { id: 'name', label: 'Member Name', sortable: true },
  { id: 'centerPlace', label: 'Center Place', sortable: false },
  { id: 'phoneNumber', label: 'Phone Number', sortable: false },
  { id: 'address', label: 'Address', sortable: false },
  { id: 'weeklyAmount', label: 'Weekly Amount', sortable: true, align: 'right' },
  { id: 'currentWeekPaid', label: 'Current Week Paid', align: 'right' },
  { id: 'remainingAmount', label: 'Remaining Amount', align: 'right' },
  { id: 'lastPaymentMethod', label: 'Payment Method' },
  { id: 'lastPaymentDate', label: 'Payment Date' },
  { id: 'currentWeekStatus', label: 'Status' },
  { id: 'actions', label: 'Actions', align: 'center' },
];

export default function MembersTable({ members, sortBy, sortDir, onSortChange, onEdit, onDelete, onOpenProfile }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 560 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableCell key={col.id} align={col.align || 'left'}>
                {col.sortable ? (
                  <TableSortLabel
                    active={sortBy === col.id}
                    direction={sortBy === col.id ? sortDir : 'asc'}
                    onClick={() => onSortChange(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">No members found</Typography>
              </TableCell>
            </TableRow>
          )}
          {members.map((member) => (
            <TableRow
              key={member.id}
              hover
              sx={{
                '&:last-child td': { border: 0 },
                bgcolor: member.headMember ? 'rgba(201,138,61,0.06)' : 'transparent',
              }}
            >
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {member.headMember && (
                    <Tooltip title="Head member">
                      <StarRoundedIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                    </Tooltip>
                  )}
                  <Typography
                    component="button"
                    onClick={() => onOpenProfile(member)}
                    sx={{
                      fontFamily: moneyFontFamily, fontSize: 13,
                      color: 'primary.main', background: 'none', border: 'none',
                      cursor: 'pointer', p: 0, textDecoration: 'underline',
                    }}
                  >
                    {member.memberCode}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography
                  component="button"
                  onClick={() => onOpenProfile(member)}
                  sx={{
                    fontWeight: member.headMember ? 700 : 400,
                    color: member.headMember ? 'secondary.dark' : 'text.primary',
                    background: 'none', border: 'none', cursor: 'pointer',
                    p: 0, fontSize: 'inherit',
                  }}
                >
                  {member.name}
                  {member.headMember && (
                    <Chip label="Head" size="small" color="warning"
                      sx={{ ml: 0.5, height: 16, fontSize: 10 }} />
                  )}
                </Typography>
              </TableCell>
              <TableCell>{member.centerPlace || '-'}</TableCell>
              <TableCell>{member.phoneNumber}</TableCell>
              <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.address}
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: moneyFontFamily }}>
                {formatCurrency(member.weeklyAmount)}
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: moneyFontFamily, color: 'success.main' }}>
                {formatCurrency(member.currentWeekPaid)}
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: moneyFontFamily, color: member.remainingAmount > 0 ? 'error.main' : 'text.secondary' }}>
                {formatCurrency(member.remainingAmount)}
              </TableCell>
              <TableCell>
                {member.lastPaymentMethod ? <PaymentMethodBadge method={member.lastPaymentMethod} /> : '-'}
              </TableCell>
              <TableCell>{member.lastPaymentDate ? formatDate(member.lastPaymentDate) : '-'}</TableCell>
              <TableCell><StatusChip status={member.currentWeekStatus} /></TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                  <Tooltip title="Payment history">
                    <IconButton size="small" onClick={() => onOpenProfile(member)}>
                      <ReceiptLongRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit member">
                    <IconButton size="small" onClick={() => onEdit(member)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete member">
                    <IconButton size="small" color="error" onClick={() => onDelete(member)}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
