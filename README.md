# Microfinance Management System — Frontend

React + Vite + Material UI admin dashboard for the billing collection management system. Talks to the Spring Boot backend built in phase 1.

This build was verified with `npm run build` and a dev-server smoke test — both pass cleanly.

## Tech stack

- React 19 + Vite
- React Router v7
- Material UI (MUI) v9
- Axios
- React Hook Form
- Context API (auth, theme, toast notifications)
- Chart.js (via react-chartjs-2)
- jsPDF + jspdf-autotable (PDF export)
- SheetJS / xlsx (Excel export)

## Project layout

```
src/
  components/
    common/      LoadingSpinner, ConfirmDialog, StatusChip, PaymentMethodBadge, ProtectedRoute
    layout/      Sidebar (collapsible), Topbar
    members/     MemberFormDialog, MembersTable
    payments/    PaymentFormDialog
    charts/      SummaryCards, DashboardCharts, chartSetup
  pages/         LoginPage, DashboardPage, CollectionPage, MemberProfilePage, ReportsPage, SettingsPage
  layouts/       DashboardLayout (sidebar + topbar shell)
  services/      apiClient (axios + JWT interceptor), authService, memberService, paymentService, reportService, dashboardService
  context/       AuthContext, ThemeModeContext, ToastContext
  hooks/         useAuth, useToast, useThemeMode, useDebouncedValue
  utils/         formatters.js (currency/date/ISO week), constants.js
  styles/        theme.js (MUI theme, matches the backend's ledger-style design language)
```

## 1. Prerequisites

- Node.js 18+ and npm
- The backend running (see the backend README) at `http://localhost:8080`

## 2. Install

```bash
cd microfinance-frontend
npm install
```

## 3. Configure the API URL

Copy `.env.example` to `.env` and adjust if your backend isn't on the default port:

```bash
cp .env.example .env
```

```
VITE_API_BASE_URL=http://localhost:8080/api
```

## 4. Run

```bash
npm run dev
```

Open `http://localhost:5173`. Log in with the seeded admin account:

```
username: admin
password: admin123
```

## 5. Build for production

```bash
npm run build
npm run preview   # serve the production build locally to sanity-check it
```

Output goes to `dist/`. Deploy that folder behind any static host (Nginx, Vercel, Netlify, S3+CloudFront) — just make sure `VITE_API_BASE_URL` is set correctly at build time for that environment, since Vite inlines env vars at build, not at runtime.

## What's implemented against the spec

- **Auth**: login page, JWT stored client-side, automatic logout + redirect on a 401 from any API call, protected routes.
- **Layout**: collapsible sidebar (open/close button, smooth width transition), sticky topbar, dark mode toggle (persisted).
- **Collection page**: Material UI table with all 11 spec'd columns, sticky header, sortable name/weekly-amount columns, pagination, search (debounced) by name/phone/member ID, filter chips (All/Paid/Pending/Cash/Online), Create Member dialog, Edit, Delete with confirmation.
- **Payment entry**: Add Payment dialog with week/year/date/amount, Cash/Online toggle, UPI transaction ID field that only appears (and is required) for Online, live remaining/credit preview as you type.
- **Member profile page**: full payment history table, due-history summary banner, edit/delete individual payments.
- **Dashboard**: the 6 summary cards (members, this week's collection, cash, online, remaining due, total outstanding) and 4 charts (weekly trend, monthly trend, payment-method doughnut, top outstanding members).
- **Reports**: weekly/monthly/yearly tabs, filters (member, payment method, date/week/month/year), Export PDF, Export Excel, Print (with print-specific CSS that hides the sidebar/topbar/buttons).
- **UX details**: loading spinners, toast notifications (success/error), confirmation dialogs before delete, responsive layout down to mobile widths.

## Known gaps / next steps

- **Change password**: the Settings page form is built and validated but there's no `POST /api/auth/change-password` endpoint on the backend yet — wire it up there first, then point this form at it.
- **Receipt printing**: payment receipts aren't a dedicated printable view yet; the Reports page's Print button covers report printing. A per-payment receipt template (matching the SRS's "Receipt Module") would be a good next addition.
- **Member photo / documents**: not implemented — the original loan-system SRS mentioned these, but they weren't in this billing-collection prompt's member fields.
- Large vendor bundle (~1.6MB minified, mostly MUI + jsPDF + xlsx) — fine for an internal admin tool, but consider route-based code-splitting (`React.lazy`) if this gets deployed publicly.

## Common errors

| Symptom | Fix |
|---|---|
| Network error / CORS error on login | Backend not running, or its `app.cors.allowed-origins` doesn't include your frontend's origin (default Vite port is 5173) |
| Blank page after login | Check the browser console — usually a stale/invalid token; clear localStorage and log in again |
| 401 immediately after a successful login | Backend `jwt.secret` changed between requests (e.g. server restarted with a different value) — log in again |
| Export PDF/Excel button does nothing | The current report has zero rows — there's nothing to export yet |
