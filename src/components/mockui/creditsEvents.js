/**
 * Window events that keep the nav's credits pill and Buy-credits modal in sync
 * without a shared provider. TopNav listens to both; anything that changes the
 * balance (a completed payment, a template unlock) fires CREDITS_CHANGED, and
 * anything that wants the purchase modal open fires OPEN_CREDITS.
 */
export const CREDITS_CHANGED_EVENT = 'cvgen:credits-changed';
export const OPEN_CREDITS_EVENT = 'cvgen:open-credits';

/** Ask the nav to re-read the balance from the server. */
export function notifyCreditsChanged() {
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
}

/** Open the Buy credits modal from anywhere a TopNav is mounted. */
export function openCreditsModal() {
  window.dispatchEvent(new Event(OPEN_CREDITS_EVENT));
}
