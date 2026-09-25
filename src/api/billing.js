import api from '@/api/axios';
import { unwrap } from '@/api/response';

/**
 * User-facing billing (the credits pill and the purchase modal).
 *
 *   GET /api/billing/packs   200 data: [{ id, name, credits, priceMinor, currency,
 *                                         active, highlighted, sortOrder, ... }]
 *   GET /api/billing/me      200 data: { balance, currency,
 *                                        transactions: [ ...at most 20, newest first ] }
 *
 * `priceMinor` is in minor units (paisa for NPR) - divide by 100 to display,
 * never store a float. Only active packs come back here; the admin endpoint
 * (`/api/admin/billing/packs`) is the one that also returns inactive ones.
 *
 *   GET  /api/billing/gateways              200 data: ["ESEWA", "KHALTI"]  (only configured ones)
 *   POST /api/billing/checkout              200 data: { orderId, gateway, method, url, fields }
 *   POST /api/billing/orders/{id}/confirm   200 data: PaymentOrder   (idempotent)
 *   GET  /api/billing/orders/{id}           200 data: PaymentOrder
 *
 *   PaymentOrder: { id, gateway, status: PENDING|COMPLETED|FAILED|CANCELED, credits, amountMinor,
 *                   currency, packName, failureReason, balance, createdAt, completedAt }
 *
 * Buying is: checkout -> send the browser to the gateway (a signed form POST
 * for eSewa, a redirect for Khalti) -> the gateway returns to
 * /billing/return/<gateway> -> confirm. Credits are granted only on the
 * server's own check with the gateway, never on what the return URL says.
 */

/** Minor units -> a display string, e.g. (25000, "NPR") -> "NPR 250". */
export function formatPrice(priceMinor, currency = 'NPR') {
  const major = priceMinor / 100;
  return `${currency} ${major.toLocaleString(undefined, {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function listCreditPacks() {
  return unwrap(await api.get('/api/billing/packs'));
}

export async function getMyBillingAccount() {
  return unwrap(await api.get('/api/billing/me'));
}

export const GATEWAY = { ESEWA: 'ESEWA', KHALTI: 'KHALTI' };

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
};

export async function listGateways() {
  return unwrap(await api.get('/api/billing/gateways')) ?? [];
}

export async function startCheckout({ packId, gateway }) {
  return unwrap(await api.post('/api/billing/checkout', { packId, gateway }));
}

export async function confirmOrder(orderId) {
  return unwrap(await api.post(`/api/billing/orders/${encodeURIComponent(orderId)}/confirm`));
}

export async function getOrder(orderId) {
  return unwrap(await api.get(`/api/billing/orders/${encodeURIComponent(orderId)}`));
}

/**
 * Leave the app for the gateway's payment page. eSewa takes a form POST (the
 * signature covers the amount, so the fields go exactly as the server sent
 * them); Khalti is a plain redirect.
 */
export function goToGateway(checkout) {
  if (checkout.method === 'FORM_POST') {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = checkout.url;
    Object.entries(checkout.fields || {}).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    return;
  }
  window.location.assign(checkout.url);
}
