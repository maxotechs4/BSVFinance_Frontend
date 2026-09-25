import { useEffect, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { dashboardService } from '../services/dashboardService';
import { extractErrorMessage } from '../services/apiClient';
import GroupSummaryCards from '../components/charts/GroupSummaryCards';
import ReportsSection from '../components/reports/ReportsSection';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DashboardPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const groupsData = await dashboardService.groups();
        if (!cancelled) {
          setGroups(groupsData);
        }
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
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Welcome to BSV Foundation Management Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Total Collection in Groups
      </Typography>
      <GroupSummaryCards groups={groups} />

      <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
        Total Collection Reports
      </Typography>
      <ReportsSection />
    </Box>
  );
}
