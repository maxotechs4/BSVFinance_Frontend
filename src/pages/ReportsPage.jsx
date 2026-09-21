import { Box, Typography } from '@mui/material';
import WeekdayMembersPanel from '../components/members/WeekdayMembersPanel';

export default function ReportsPage() {
  return (
    <Box>
      <Typography
        variant="h5"
        sx={{ mb: 2 }}
        className="no-print"
      >
        Demand
      </Typography>

      <WeekdayMembersPanel />
    </Box>
  );
}