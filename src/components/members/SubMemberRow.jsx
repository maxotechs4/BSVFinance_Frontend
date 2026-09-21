import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded';
import StatusChip from '../common/StatusChip';
import MemberStatsBlock from './MemberStatsBlock';

/**
 * A single sub-member row, indented under its head in the accordion.
 * Purely presentational — all actions are delegated to the parent via props.
 */
export default function SubMemberRow({ member, onEdit, onDelete, onOpenProfile, onEditCharges }) {
  return (
    <Box
      onClick={() => onOpenProfile(member)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        rowGap: 1,
        columnGap: 1.5,
        pl: { xs: 4, sm: 6 },
        pr: 2,
        py: 1,
        cursor: 'pointer',
        borderRadius: 1,
        transition: 'background-color 150ms ease',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <FiberManualRecordRoundedIcon sx={{ fontSize: 7, color: 'text.disabled', flexShrink: 0 }} />

      <Box sx={{ minWidth: 0, flex: '1 1 160px' }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {member.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {member.memberCode} · {member.phoneNumber}{member.centerPlace ? ` · ${member.centerPlace}` : ''}
        </Typography>
      </Box>

      {/* Wraps as one group onto its own line on narrow screens */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          rowGap: 1,
          columnGap: 1.5,
          ml: { xs: 2.5, sm: 0 },
        }}
      >
        <MemberStatsBlock
          weeklyAmount={member.weeklyAmount}
          totalPaid={member.totalPaid}
          totalBalance={member.totalBalance}
        />

        <StatusChip status={member.currentWeekStatus} />

        <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
          {onEditCharges && (
            <Tooltip title="Add / edit charges">
              <IconButton size="small" onClick={() => onEditCharges(member)}>
                <CurrencyRupeeRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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
      </Box>
    </Box>
  );
}