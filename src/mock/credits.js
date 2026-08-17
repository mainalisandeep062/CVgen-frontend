/**
 * MOCK SERVICE — credits & payments.
 *
 * The backend has no credits, payments, or template-licensing endpoints yet.
 * This fakes the wallet in localStorage so the credits pill, purchase modal,
 * and template-unlock flow are usable end to end.
 *
 * Backend contract this mock is shaped for:
 *   GET  /api/credits/balance            -> getBalance()
 *   GET  /api/credits/packs              -> CREDIT_PACKS
 *   POST /api/payments/initiate          -> purchaseCredits(packId, method)
 *        body: { packId, method: "esewa" | "khalti" | "connectips" }
 *        real flow: 302 to the gateway, callback verifies, credits land
 *   POST /api/templates/{id}/unlock      -> unlockPremiumTemplate()
 *
 * No real payment is ever initiated here — purchaseCredits just simulates the
 * gateway round trip and settles instantly.
 */

const BALANCE_KEY = 'cvgen.mock.credits.v1';
const DEFAULT_BALANCE = 12;

export const CREDIT_PACKS = [
  { id: 'pack-5', credits: 5, priceNpr: 250 },
  { id: 'pack-15', credits: 15, priceNpr: 600, best: true },
  { id: 'pack-50', credits: 50, priceNpr: 1800 },
];

export const PAYMENT_METHODS = ['eSewa', 'Khalti', 'ConnectIPS'];

/** GET /api/credits/balance */
export function getBalance() {
  const raw = localStorage.getItem(BALANCE_KEY);
  if (raw === null) {
    localStorage.setItem(BALANCE_KEY, String(DEFAULT_BALANCE));
    return DEFAULT_BALANCE;
  }
  return Number(raw) || 0;
}

function setBalance(value) {
  localStorage.setItem(BALANCE_KEY, String(value));
  window.dispatchEvent(new Event('cvgen:credits-changed'));
  return value;
}

/**
 * POST /api/payments/initiate — SIMULATED.
 * Pretends the eSewa/Khalti/ConnectIPS round trip succeeded and settles the
 * credits immediately. The real flow redirects to the gateway and settles via
 * a server-verified callback.
 */
export function purchaseCredits(packId) {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return getBalance();
  return setBalance(getBalance() + pack.credits);
}

/**
 * POST /api/templates/{id}/unlock — SIMULATED.
 * Redeems 1 credit for a premium template. Returns false when the wallet is
 * empty so the UI can push the user to the purchase modal instead.
 */
export function unlockPremiumTemplate() {
  const balance = getBalance();
  if (balance < 1) return false;
  setBalance(balance - 1);
  return true;
}
