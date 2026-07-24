/**
 * Access-token storage, shared between the axios layer and AuthContext.
 *
 * The access token lives ONLY in memory (a module-level variable) — it is never
 * written to sessionStorage/localStorage, so it is not readable by injected
 * scripts across a reload and it does not survive a page refresh. Durable
 * session identity is carried by the httpOnly refresh cookie instead: on every
 * app load AuthContext calls /api/auth/refresh once to mint a fresh access
 * token back into this store (see AuthContext bootstrap).
 *
 * This module is the single writer so that the axios 401/refresh interceptor
 * and the React auth state never disagree: every mutation dispatches an
 * `auth:changed` window event that AuthContext listens to, giving same-tab
 * reactivity. (Being in-memory, the token is inherently per-tab; there is no
 * cross-tab `storage` event to mirror.)
 *
 * The backend only ever returns an access token in the JSON body — wrapped in
 * the standard envelope, so it reads as `data.data.accessToken` (see
 * api/response.js). The refresh token and the trusted-device remember-me token
 * are httpOnly cookies the browser holds and JS cannot read — so there is
 * intentionally no entry for either here.
 */

export const AUTH_CHANGED_EVENT = 'auth:changed';

let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

function notify() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setAccessToken(token) {
  accessToken = token || null;
  notify();
}

export function clearAccessToken() {
  accessToken = null;
  notify();
}
