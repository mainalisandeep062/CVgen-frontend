import { relativeTime } from '@/cv/content';

/**
 * Formatting helpers for the admin console.
 *
 * Backend timestamps are zone-less `LocalDateTime` strings, parsed as local
 * time (same convention as cv/content toTimestamp). Unlike toTimestamp these
 * return null for a missing value instead of "now", because admin data has
 * legitimately-null dates (e.g. `lastLoginAt` for a user who never signed in).
 * Calendar buckets (`series[].date`) are `yyyy-MM-dd` in UTC.
 */

export function parseTimestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** 60000 → "NPR 600.00". Minor units (paisa) in, never floats on the wire. */
export function formatMoney(minor, currency = 'NPR') {
  const value = Number(minor);
  if (minor === null || minor === undefined || !Number.isFinite(value)) return '—';
  const major = (value / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency || 'NPR'} ${major}`;
}

/** Axis-friendly money: 1250000 minor → "12.5k". */
export function formatMoneyCompact(minor) {
  const major = Number(minor) / 100;
  if (!Number.isFinite(major)) return '';
  return major.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
}

export function formatNumber(value) {
  const number = Number(value);
  if (value === null || value === undefined || !Number.isFinite(number)) return '—';
  return number.toLocaleString('en-US');
}

/**
 * Count with its noun, pluralised: (1, 'CV') → "1 CV", (4, 'CV') → "4 CVs".
 * Pass `plural` for nouns an "s" doesn't fix ('entry' → 'entries').
 */
export function pluralise(value, singular, plural = `${singular}s`) {
  const number = Number(value) || 0;
  return `${formatNumber(number)} ${Math.abs(number) === 1 ? singular : plural}`;
}

/** Signed credit delta: 15 → "+15", -3 → "−3". */
export function formatSigned(value) {
  const number = Number(value) || 0;
  if (number > 0) return `+${number.toLocaleString('en-US')}`;
  if (number < 0) return `−${Math.abs(number).toLocaleString('en-US')}`;
  return '0';
}

export function formatDate(value) {
  const ts = parseTimestamp(value);
  if (ts === null) return '—';
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  const ts = parseTimestamp(value);
  if (ts === null) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "3 hours ago", or `fallback` when the value is missing. */
export function timeAgo(value, fallback = 'Never') {
  const ts = parseTimestamp(value);
  return ts === null ? fallback : relativeTime(ts);
}

/** UTC calendar bucket "2026-08-17" → "17 Aug". */
export function formatDay(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * Period-over-period change.
 * @returns {{ direction: 'up'|'down'|'flat'|'new', pct: number|null }}
 */
export function periodChange(current, previous) {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (now === before) return { direction: 'flat', pct: 0 };
  if (before === 0) return { direction: 'new', pct: null };
  const pct = ((now - before) / before) * 100;
  return { direction: pct > 0 ? 'up' : 'down', pct };
}

/**
 * "600" / "600.5" / "600.50" → 60050 minor units; null when not a valid
 * non-negative amount with at most two decimals.
 */
export function parseMajorToMinor(text) {
  const trimmed = String(text ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** 60050 → "600.50" for an edit form. */
export function minorToMajorInput(minor) {
  const value = Number(minor) || 0;
  return (value / 100).toFixed(2);
}

/** "USER_ROLE_CHANGED" → "User role changed". */
export function humanizeEnum(value) {
  if (!value) return '';
  const words = String(value).toLowerCase().split('_');
  return words.map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(' ');
}

/** Loose email shape check for client-side hints only. */
export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());
}
