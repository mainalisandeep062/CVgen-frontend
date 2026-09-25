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
 * `priceMinor` is in minor units (paisa for NPR) — divide by 100 to display,
 * never store a float. Only active packs come back here; the admin endpoint
 * (`/api/admin/billing/packs`) is the one that also returns inactive ones.
 *
 * THERE IS NO PURCHASE ENDPOINT. No payment gateway is wired up, so credits
 * can only be granted by an admin (`POST /api/admin/users/{id}/credits`). The
 * modal shows the packs and says so, rather than pretending a payment settled.
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
