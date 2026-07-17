/**
 * Access-token storage, shared between the axios layer and AuthContext.
 *
 * The access token lives in sessionStorage (a documented dev-flow choice —
 * see AuthContext for why). This module is the single writer so that the
 * axios 401/refresh interceptor and the React auth state never disagree:
 * every mutation dispatches an `auth:changed` window event that AuthContext
 * listens to, giving same-tab reactivity that the native `storage` event
 * (cross-tab only) does not provide.
 *
 * The backend only ever returns an access token in the JSON body
 * (TokenResponse = { accessToken }). The refresh token is an httpOnly cookie
 * the browser holds and JS cannot read — so there is intentionally no
 * refresh-token entry here.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
export const AUTH_CHANGED_EVENT = 'auth:changed';

export function getAccessToken() {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function notify() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function setAccessToken(token) {
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // sessionStorage unavailable (e.g. privacy mode) — nothing else we can do.
  }
  notify();
}

export function clearAccessToken() {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
  notify();
}
