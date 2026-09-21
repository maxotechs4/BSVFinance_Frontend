
export function formatCurrency(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatDate(isoDate) {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '-';
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Returns today's date as yyyy-MM-dd, suitable for <input type="date"> defaults */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** ISO week-of-year (1-53) for a given Date, matching java.time.temporal.IsoFields on the backend */
export function isoWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function isoWeekYear(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/** Title-case label for display, e.g. "MONDAY" -> "Monday" */
export function weekdayLabel(weekday) {
  if (!weekday) return '-';
  return weekday.charAt(0) + weekday.slice(1).toLowerCase();
}

export const STATUS_COLORS = {
  PAID: 'success',
  PARTIAL: 'warning',
  PENDING: 'error',
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Monday (UTC) of the given ISO week/year, matching java.time.temporal.IsoFields on the backend */
export function isoWeekToMonday(week, year) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return target;
}

/**
 * Given a member's latest recorded {week, year}, returns the next one
 * (correctly rolling over 52 vs 53-week years, since it's driven by real
 * Date arithmetic rather than a fixed "+1, wrap at 52" assumption).
 * Pass week/year as null/undefined to get the current ISO week instead
 * (used when a member has no payment history yet).
 */
export function nextIsoWeek(week, year) {
  if (!week || !year) {
    return { week: isoWeekNumber(), year: isoWeekYear() };
  }
  const monday = isoWeekToMonday(week, year);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return { week: isoWeekNumber(monday), year: isoWeekYear(monday) };
}
