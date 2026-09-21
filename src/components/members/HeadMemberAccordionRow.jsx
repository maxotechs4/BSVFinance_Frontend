import {
  Box, Typography, IconButton, Tooltip, Collapse, Chip, Skeleton,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StatusChip from '../common/StatusChip';
import SubMemberRow from './SubMemberRow';
import MemberStatsBlock from './MemberStatsBlock';

/**
 * One head member's row, with a collapsible section underneath listing
 * their sub-members. Expansion state is fully controlled by the parent
 * (CollectionPage) so that only one head can be open at a time.
 */
export default function HeadMemberAccordionRow({
  head, expanded, onToggle, subMembers, subMembersLoading,
  onEdit, onDelete, onOpenProfile, onEditCharges, filteredNotice,
}) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        mb: 1.5,
        overflow: 'hidden',
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
        ...(expanded && { borderColor: 'secondary.main', boxShadow: 1 }),
      }}
    >
      {/* Head row — wraps onto a second line on narrow screens instead of overflowing */}
      <Box
        onClick={() => onOpenProfile(head)}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          rowGap: 1,
          columnGap: 1.5,
          px: 2,
          py: 1.25,
          cursor: 'pointer',
          bgcolor: expanded ? 'rgba(201,138,61,0.08)' : 'background.paper',
          transition: 'background-color 150ms ease',
          '&:hover': { bgcolor: expanded ? 'rgba(201,138,61,0.12)' : 'action.hover' },
        }}
      >
        <IconButton
          size="small"
          disableRipple
          onClick={(e) => { e.stopPropagation(); onToggle(head.id); }}
          sx={{
            p: 0.25,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 300ms ease',
          }}
        >
          <ExpandMoreRoundedIcon fontSize="small" />
        </IconButton>

        <StarRoundedIcon sx={{ fontSize: 16, color: 'secondary.main', flexShrink: 0 }} />

        <Box sx={{ minWidth: 0, flex: '1 1 160px' }}>
          <Typography
            variant="body1"
            noWrap
            sx={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, lineHeight: 1.3 }}
          >
            {head.centerPlace || '—'}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {head.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {head.memberCode} · {head.phoneNumber}
          </Typography>
        </Box>

        <Chip
          label={`${(head.subMemberCount ?? 0) + 1} member${(head.subMemberCount ?? 0) + 1 === 1 ? '' : 's'}`}
          size="small"
          variant="outlined"
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        />

        {/* Everything below wraps together as one group, so on narrow screens
            it drops to its own line under the name/code block rather than
            squeezing/clipping individual pieces. */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            rowGap: 1,
            columnGap: 1.5,
            ml: { xs: 4.5, sm: 0 },
          }}
        >
          <MemberStatsBlock
            weeklyAmount={head.weeklyAmount}
            totalPaid={head.totalPaid}
            totalBalance={head.totalBalance}
          />

          <StatusChip status={head.currentWeekStatus} />

          <Box sx={{ display: 'flex', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
            {onEditCharges && (
              <Tooltip title="Add / edit charges">
                <IconButton size="small" onClick={() => onEditCharges(head)}>
                  <CurrencyRupeeRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Payment history">
              <IconButton size="small" onClick={() => onOpenProfile(head)}>
                <ReceiptLongRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit member">
              <IconButton size="small" onClick={() => onEdit(head)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete member">
              <IconButton size="small" color="error" onClick={() => onDelete(head)}>
                <DeleteRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Sub-members (animated expand/collapse) */}
      <Collapse in={expanded} timeout={300} unmountOnExit>
        <Box sx={{ py: 0.5, bgcolor: 'background.default' }}>
          {filteredNotice && !subMembersLoading && (
            <Typography variant="caption" color="secondary.main" sx={{ pl: { xs: 4, sm: 6 }, pb: 0.5, display: 'block', fontWeight: 600 }}>
              {filteredNotice}
            </Typography>
          )}
          {subMembersLoading ? (
            <Box sx={{ px: 2, py: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
          ) : subMembers.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ pl: { xs: 4, sm: 6 }, py: 1, display: 'block' }}>
              No sub-members added yet
            </Typography>
          ) : (
            subMembers.map((sub) => (
              <SubMemberRow
                key={sub.id}
                member={sub}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenProfile={onOpenProfile}
                onEditCharges={onEditCharges}
              />
            ))
          )}
        </Box>
      </Collapse>
    </Box>
  );
}