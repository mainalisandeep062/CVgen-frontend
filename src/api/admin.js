import api from '@/api/axios';
import { unwrap } from '@/api/response';

/**
 * Admin console endpoints. Every path here requires ROLE_ADMIN server-side
 * (403 `error.forbidden` otherwise - the backend also re-checks the DB per
 * request, so a demoted admin fails even with a still-valid token).
 *
 * Source of truth: the shared admin API contract (backend ⇄ frontend).
 * Paged responses are `{ items, page, size, totalElements, totalPages }`;
 * paging params are Spring's `page` (0-based), `size` (max 100) and
 * `sort` ("field,asc|desc"). Money is integer minor units (paisa) + currency.
 *
 * Analytics
 *   GET    /api/admin/analytics/overview?days=30             overview (days 7..365)
 *
 * Users
 *   GET    /api/admin/users?q=&role=&status=&page=&size=&sort=  Page<AdminUserSummary>
 *   GET    /api/admin/users/{userId}                         AdminUserDetail          404
 *   PATCH  /api/admin/users/{userId}   { role?, status?, name? }  AdminUserDetail
 *                                      400 self change · 409 last active admin
 *   DELETE /api/admin/users/{userId}                         data: null   400 self · 409 last admin
 *   POST   /api/admin/users/{userId}/credits { credits, note }  201 CreditTransaction
 *                                      400 validation / balance would go negative
 *
 * Templates
 *   GET    /api/admin/templates/layouts                      [{ key, name, supportedSections }]
 *   GET    /api/admin/templates                              AdminTemplate[]
 *   POST   /api/admin/templates                              201 AdminTemplate  409 key exists · 400 layout/section
 *   PUT    /api/admin/templates/{id}                         AdminTemplate (key immutable)
 *   DELETE /api/admin/templates/{id}                         data: null   409 in use / default
 *
 * Billing
 *   GET    /api/admin/billing/summary?days=30
 *   GET    /api/admin/billing/transactions?q=&type=&status=&page=&size=
 *   POST   /api/admin/billing/transactions/{id}/refund { note? }  201 REFUND row · 409 not refundable
 *   GET    /api/admin/billing/packs                          CreditPack[]
 *   POST   /api/admin/billing/packs                          201 CreditPack
 *   PUT    /api/admin/billing/packs/{id}                     CreditPack
 *   DELETE /api/admin/billing/packs/{id}                     data: null   409 in use
 *
 * Notifications
 *   GET    /api/admin/notifications?page=&size=              Page<AdminNotification>
 *   POST   /api/admin/notifications                          201 AdminNotification  404 unknown recipient
 *   DELETE /api/admin/notifications/{id}                     data: null
 *
 * Audit log
 *   GET    /api/admin/audit-logs?action=&page=&size=         Page<AuditLog>
 *
 * Reads return the unwrapped payload. Mutations return the raw axios response
 * so callers can toast the backend's localized `message` and still read
 * `unwrap(response)`. Errors propagate: use apiMessage / apiStatus /
 * fieldErrors from api/response.js.
 */

export const ADMIN_PAGE_SIZE = 20;

export const USER_ROLE = { USER: 'USER', ADMIN: 'ADMIN' };
export const USER_STATUS = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' };

export const TRANSACTION_TYPE = {
  PURCHASE: 'PURCHASE',
  ADMIN_GRANT: 'ADMIN_GRANT',
  ADMIN_DEDUCT: 'ADMIN_DEDUCT',
  SPEND: 'SPEND',
  REFUND: 'REFUND',
};

export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

export const NOTIFICATION_LEVEL = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
};

export const NOTIFICATION_AUDIENCE = { ALL: 'ALL', USER: 'USER' };

export const ADMIN_ACTIONS = [
  'USER_UPDATED',
  'USER_ROLE_CHANGED',
  'USER_STATUS_CHANGED',
  'USER_DELETED',
  'CREDITS_ADJUSTED',
  'TRANSACTION_REFUNDED',
  'TEMPLATE_CREATED',
  'TEMPLATE_UPDATED',
  'TEMPLATE_DELETED',
  'PACK_CREATED',
  'PACK_UPDATED',
  'PACK_DELETED',
  'NOTIFICATION_SENT',
  'NOTIFICATION_DELETED',
];

/** Validation bounds mirrored from the contract (server stays authoritative). */
export const LIMITS = {
  userName: 255,
  creditsAbs: 100000,
  creditNote: 500,
  templateKeyPattern: /^[a-z0-9][a-z0-9-]{1,62}$/,
  templateName: 120,
  templateDescription: 500,
  accentColorPattern: /^#[0-9A-Fa-f]{6}$/,
  templateCreditCostMax: 1000,
  packName: 80,
  packCreditsMax: 100000,
  packPriceMinorMax: 100000000,
  refundNote: 500,
  notificationTitle: 160,
  notificationBody: 2000,
  notificationLink: 512,
};

const enc = encodeURIComponent;

/** Drop empty filters so the server sees "no filter" rather than `role=`. */
function params(values) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

/* ---------- Analytics ---------- */

export async function fetchOverview(days = 30) {
  return unwrap(await api.get('/api/admin/analytics/overview', { params: { days } }));
}

/* ---------- Users ---------- */

export async function listUsers({ q, role, status, page = 0, size = ADMIN_PAGE_SIZE, sort } = {}) {
  return unwrap(
    await api.get('/api/admin/users', { params: params({ q, role, status, page, size, sort }) })
  );
}

export async function getUser(userId) {
  return unwrap(await api.get(`/api/admin/users/${enc(userId)}`));
}

/** Only the fields present are changed: `{ role?, status?, name? }`. */
export function updateUser(userId, changes) {
  return api.patch(`/api/admin/users/${enc(userId)}`, changes);
}

export function deleteUser(userId) {
  return api.delete(`/api/admin/users/${enc(userId)}`);
}

/** `credits` is the signed delta (≠ 0); `note` is required. */
export function adjustUserCredits(userId, { credits, note }) {
  return api.post(`/api/admin/users/${enc(userId)}/credits`, { credits, note });
}

/* ---------- Templates ---------- */

export async function listTemplateLayouts() {
  return unwrap(await api.get('/api/admin/templates/layouts')) ?? [];
}

export async function listAdminTemplates() {
  return unwrap(await api.get('/api/admin/templates')) ?? [];
}

export function createTemplate(body) {
  return api.post('/api/admin/templates', body);
}

/** Same body as create; `key` is immutable and omitted. */
export function updateTemplate(id, body) {
  return api.put(`/api/admin/templates/${enc(id)}`, body);
}

export function deleteTemplate(id) {
  return api.delete(`/api/admin/templates/${enc(id)}`);
}

/* ---------- Billing ---------- */

export async function fetchBillingSummary(days = 30) {
  return unwrap(await api.get('/api/admin/billing/summary', { params: { days } }));
}

export async function listTransactions({ q, type, status, page = 0, size = ADMIN_PAGE_SIZE } = {}) {
  return unwrap(
    await api.get('/api/admin/billing/transactions', {
      params: params({ q, type, status, page, size }),
    })
  );
}

export function refundTransaction(id, { note } = {}) {
  return api.post(`/api/admin/billing/transactions/${enc(id)}/refund`, note ? { note } : {});
}

export async function listCreditPacks() {
  return unwrap(await api.get('/api/admin/billing/packs')) ?? [];
}

export function createCreditPack(body) {
  return api.post('/api/admin/billing/packs', body);
}

export function updateCreditPack(id, body) {
  return api.put(`/api/admin/billing/packs/${enc(id)}`, body);
}

export function deleteCreditPack(id) {
  return api.delete(`/api/admin/billing/packs/${enc(id)}`);
}

/* ---------- Notifications ---------- */

export async function listAdminNotifications({ page = 0, size = ADMIN_PAGE_SIZE } = {}) {
  return unwrap(await api.get('/api/admin/notifications', { params: { page, size } }));
}

export function sendNotification(body) {
  return api.post('/api/admin/notifications', body);
}

export function deleteNotification(id) {
  return api.delete(`/api/admin/notifications/${enc(id)}`);
}

/* ---------- Audit log ---------- */

export async function listAuditLogs({ action, page = 0, size = ADMIN_PAGE_SIZE } = {}) {
  return unwrap(await api.get('/api/admin/audit-logs', { params: params({ action, page, size }) }));
}
