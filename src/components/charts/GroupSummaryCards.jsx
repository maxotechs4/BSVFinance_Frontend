import { Grid, Paper, Box, Typography, LinearProgress, Chip } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { formatCurrency } from '../../utils/formatters';
import { moneyFontFamily } from '../../styles/theme';
import { useNavigate } from 'react-router-dom';

function GroupCard({ group }) {
  const navigate = useNavigate();
  const openGroup = () => navigate(`/groups/${group.headId}`);
  const expected = Number(group.totalExpectedThisWeek || 0);
  const collected = Number(group.totalCollectedThisWeek || 0);
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const fullyCollected = expected > 0 && collected >= expected;

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: 34, height: 3, bgcolor: 'primary.main' }} />
      <Box sx={{ position: 'absolute', top: 0, left: 38, width: 12, height: 3, bgcolor: 'secondary.main' }} />

      <Typography
        variant="subtitle1"
        noWrap
        role="link"
        tabIndex={0}
        onClick={openGroup}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openGroup();
        }}
        sx={{
          fontFamily: "'Source Serif 4', serif",
          fontWeight: 700,
          mt: 1,
          lineHeight: 1.3,
          cursor: 'pointer',
          width: 'fit-content',
          maxWidth: '100%',
          '&:hover': { textDecoration: 'underline', textDecorationColor: '#E31E24', textDecorationThickness: '1.5px' },
        }}
      >
        {group.headName || '—'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        <StarRoundedIcon sx={{ fontSize: 15, color: 'secondary.main', flexShrink: 0 }} />
        <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.2 }}>
          {group.centerPlace || '—'}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 1.5 }}>
        Center Code : {group.centerCode || '—'}
      </Typography>

      {/* Total members in the group */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <GroupsRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="body2" color="text.secondary">
          {group.totalMembers} member{group.totalMembers === 1 ? '' : 's'} in this group
        </Typography>
      </Box>

      {/* Collection progress for this week */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">Collected this week</Typography>
        <Chip
          label={fullyCollected ? 'Fully collected' : `${pct}%`}
          size="small"
          color={fullyCollected ? 'success' : pct > 0 ? 'warning' : 'default'}
          sx={{ height: 20, fontSize: '0.7rem' }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={fullyCollected ? 'success' : 'warning'}
        sx={{ height: 6, borderRadius: 3, mb: 1 }}
      />
      <Typography
        variant="h6"
        sx={{ fontFamily: moneyFontFamily, fontWeight: 500, color: fullyCollected ? 'success.main' : 'text.primary' }}
      >
        {formatCurrency(collected)}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          / {formatCurrency(expected)}
        </Typography>
      </Typography>
    </Paper>
  );
}

export default function GroupSummaryCards({ groups }) {
  if (!groups || groups.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No groups yet — create a head member to start a group.
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {groups.map((group) => (
        <Grid key={group.headId} size={{ xs: 12, sm: 6, md: 4 }}>
          <GroupCard group={group} />
        </Grid>
      ))}
    </Grid>
  );
}