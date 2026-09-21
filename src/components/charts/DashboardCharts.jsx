import '../charts/chartSetup';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { brandColors } from '../../styles/theme';
import { formatCurrency } from '../../utils/formatters';

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { callback: (v) => `₹${v / 1000}k` } },
  },
};

function ChartCard({ title, height = 260, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Box sx={{ height: 3, width: 34, bgcolor: 'primary.main', mb: 0.5 }} />
      <Box sx={{ height: 3, width: 12, bgcolor: 'secondary.main', mb: 1.5 }} />
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ height }}>{children}</Box>
    </Paper>
  );
}

export default function DashboardCharts({ charts }) {
  if (!charts) return null;

  const weeklyData = {
    labels: charts.weeklyLabels,
    datasets: [
      {
        label: 'Collection',
        data: charts.weeklyCollection,
        backgroundColor: brandColors.teal900,
        borderRadius: 4,
      },
    ],
  };

  const monthlyData = {
    labels: charts.monthlyLabels,
    datasets: [
      {
        label: 'Collection',
        data: charts.monthlyCollection,
        backgroundColor: brandColors.amber,
        borderRadius: 4,
      },
    ],
  };

  const methodTotal = Number(charts.cashTotal || 0) + Number(charts.onlineTotal || 0);
  const methodData = {
    labels: ['Cash', 'Online'],
    datasets: [
      {
        data: [charts.cashTotal, charts.onlineTotal],
        backgroundColor: [brandColors.teal900, brandColors.amber],
        borderWidth: 0,
      },
    ],
  };

  const remainingData = {
    labels: charts.remainingMemberLabels,
    datasets: [
      {
        label: 'Outstanding',
        data: charts.remainingAmounts,
        backgroundColor: brandColors.red,
        borderRadius: 4,
      },
    ],
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <ChartCard title="Weekly collection trend (last 8 weeks)">
          <Bar data={weeklyData} options={baseOptions} />
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <ChartCard title="Payment method distribution">
          {methodTotal > 0 ? (
            <Doughnut
              data={methodData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` } },
                },
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ pt: 6, textAlign: 'center' }}>
              No payments recorded yet
            </Typography>
          )}
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <ChartCard title="Monthly collection trend (last 6 months)">
          <Bar data={monthlyData} options={baseOptions} />
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <ChartCard title="Top outstanding members (this week)">
          {charts.remainingMemberLabels?.length ? (
            <Bar
              data={remainingData}
              options={{ ...baseOptions, indexAxis: 'y' }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ pt: 6, textAlign: 'center' }}>
              Everyone is paid up this week
            </Typography>
          )}
        </ChartCard>
      </Grid>
    </Grid>
  );
}
