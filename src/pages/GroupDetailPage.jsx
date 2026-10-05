import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';

import { dashboardService } from '../services/dashboardService';
import { memberService } from '../services/memberService';
import { extractErrorMessage } from '../services/apiClient';
import { formatCurrency } from '../utils/formatters';
import { moneyFontFamily, brandColors } from '../styles/theme';
import LoadingSpinner from '../components/common/LoadingSpinner';

// ---- Brand styling (logo colors: black / red / yellow) ----
const statCardSx = {
  p: 2,
  height: '100%',
  borderTop: `3px solid ${brandColors.teal700}`,
};

const tableHeadSx = {
  '& .MuiTableCell-head': {
    bgcolor: brandColors.teal900,
    color: '#FFFFFF',
    borderBottom: `3px solid ${brandColors.teal700}`,
  },
};

function StatCard({ label, value, money = false }) {
  return (
    <Paper variant="outlined" sx={statCardSx}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          mt: 0.5,
          fontFamily: money ? moneyFontFamily : undefined,
          fontWeight: 500,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

export default function GroupDetailPage() {
  const { headId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [groups, head, subMembers] = await Promise.all([
          dashboardService.groups(),
          memberService.getById(headId),
          memberService.getSubMembers(headId),
        ]);

        if (cancelled) return;

        const found = (groups || []).find((g) => String(g.headId) === String(headId));
        if (!found) {
          setError('Group not found');
        }

        setGroup(found || null);
        // The head member is always listed first, followed by the sub-members.
        setMembers([head, ...(subMembers || [])]);
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [headId]);

  if (loading) return <LoadingSpinner label="Loading group details..." />;

  const expected = Number(group?.totalExpectedThisWeek || 0);
  const collected = Number(group?.totalCollectedThisWeek || 0);
  const remaining = group?.remainingThisWeek ?? Math.max(expected - collected, 0);
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  const fullyCollected = expected > 0 && collected >= expected;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Tooltip title="Back to dashboard">
          <IconButton onClick={() => navigate('/dashboard')}>
            <ArrowBackRoundedIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {group?.headName ? `${group.headName}'s Group` : 'Group Details'}
        </Typography>

        {group?.centerPlace && (
          <Chip
            label={group.centerPlace}
            size="small"
            variant="outlined"
            sx={{
              height: 26,
              fontWeight: 600,
              color: brandColors.teal700,
              borderColor: brandColors.teal700,
            }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {group && (
        <>
          {/* Collection summary */}
          <Typography
            variant="h6"
            sx={{ mb: 2, pl: 1.5, lineHeight: 1.3, borderLeft: `4px solid ${brandColors.teal700}` }}
          >
            Group Collection (This Week)
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Members" value={group.totalMembers ?? members.length} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Collected this week" value={formatCurrency(collected)} money />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Expected this week" value={formatCurrency(expected)} money />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Remaining" value={formatCurrency(remaining)} money />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Collection progress
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {fullyCollected ? 'Fully collected' : `${pct}%`}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(232,208,25,0.25)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: fullyCollected ? brandColors.green : brandColors.teal300,
                  borderRadius: 4,
                },
              }}
            />
          </Paper>
        </>
      )}

      {/* Group members */}
      <Typography
        variant="h6"
        sx={{ mb: 2, pl: 1.5, lineHeight: 1.3, borderLeft: `4px solid ${brandColors.teal700}` }}
      >
        Group Members
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead sx={tableHeadSx}>
            <TableRow>
              <TableCell sx={{ width: 60 }}>Sl.No</TableCell>
              <TableCell sx={{ width: 30 }}>Member Name</TableCell>
              <TableCell sx={{ width: 30 }}>Member ID</TableCell>
              <TableCell sx={{ width: 0 }}>Phone Number</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No members in this group
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {members.map((member, index) => (
              <TableRow
                key={member.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/collection/${member.id}`)}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      component="span"
                      sx={{
                        width: 140,
                        flexShrink: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {member.name || '-'}
                    </Box>
                    {member.headMember && (
                      <Chip
                        icon={<StarRoundedIcon />}
                        size="small"
                        sx={{
                          ml: 1,
                          bgcolor: brandColors.teal300,
                          color: brandColors.teal900,
                          '& .MuiChip-icon': { color: brandColors.teal900, mx: '6px' },
                          '& .MuiChip-label': { display: 'none' },
                        }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{member.memberCode || '-'}</TableCell>
                <TableCell>{member.phoneNumber || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}