/**
 * Display label + badge tone for every backend enum the admin console shows.
 * Tones map to Badge's `tone` prop: neutral | primary | success | warning | danger | info.
 * Unknown values fall back to a humanized label on a neutral badge, so a new
 * backend enum value renders sensibly before this map catches up.
 */
import { humanizeEnum } from '@/admin/format';

const ROLE = {
  USER: { label: 'User', tone: 'neutral' },
  ADMIN: { label: 'Admin', tone: 'primary' },
};

const USER_STATUS = {
  ACTIVE: { label: 'Active', tone: 'success' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
};

const CV_STATUS = {
  DRAFT: { label: 'Draft', tone: 'warning' },
  READY: { label: 'Ready', tone: 'success' },
};

const TX_TYPE = {
  PURCHASE: { label: 'Purchase', tone: 'primary' },
  ADMIN_GRANT: { label: 'Admin grant', tone: 'success' },
  ADMIN_DEDUCT: { label: 'Admin deduct', tone: 'warning' },
  SPEND: { label: 'Spend', tone: 'neutral' },
  REFUND: { label: 'Refund', tone: 'info' },
};

const TX_STATUS = {
  PENDING: { label: 'Pending', tone: 'warning' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'info' },
};

const LEVEL = {
  INFO: { label: 'Info', tone: 'info' },
  SUCCESS: { label: 'Success', tone: 'success' },
  WARNING: { label: 'Warning', tone: 'warning' },
  CRITICAL: { label: 'Critical', tone: 'danger' },
};

const AUDIT_TONE = {
  USER_DELETED: 'danger',
  TEMPLATE_DELETED: 'danger',
  PACK_DELETED: 'danger',
  NOTIFICATION_DELETED: 'danger',
  USER_STATUS_CHANGED: 'warning',
  USER_ROLE_CHANGED: 'primary',
  TRANSACTION_REFUNDED: 'info',
  CREDITS_ADJUSTED: 'success',
  NOTIFICATION_SENT: 'info',
};

/** Payment gateways as the backend stores them on purchases → brand spelling. */
const PAYMENT_METHOD = {
  ESEWA: { label: 'eSewa', tone: 'success' },
  KHALTI: { label: 'Khalti', tone: 'primary' },
};

function lookup(map, value) {
  return map[value] ?? { label: humanizeEnum(value) || '-', tone: 'neutral' };
}

export const roleInfo = (value) => lookup(ROLE, value);
export const userStatusInfo = (value) => lookup(USER_STATUS, value);
export const cvStatusInfo = (value) => lookup(CV_STATUS, value);
export const txTypeInfo = (value) => lookup(TX_TYPE, value);
export const txStatusInfo = (value) => lookup(TX_STATUS, value);
export const levelInfo = (value) => lookup(LEVEL, value);
export const auditActionInfo = (value) => ({
  label: humanizeEnum(value) || '-',
  tone: AUDIT_TONE[value] ?? 'neutral',
});

/** "ESEWA" → { label: 'eSewa', tone: 'success' }; case-insensitive, unknown values humanized. */
export const paymentMethodInfo = (value) => {
  if (!value) return { label: '', tone: 'neutral' };
  return PAYMENT_METHOD[String(value).toUpperCase()] ?? { label: humanizeEnum(value), tone: 'neutral' };
};
export const paymentMethodLabel = (value) => paymentMethodInfo(value).label;
