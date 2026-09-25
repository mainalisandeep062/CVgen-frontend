import { getAccessToken, AUTH_CHANGED_EVENT } from '@/auth/tokenStore';
import { fetchCurrentUser } from '@/api/user';
import { toFileUrl } from '@/config';

/**
 * Profile-picture store - the one place the app decides which avatar to draw.
 *
 * The picture now lives on the backend: `GET /api/users/me` returns
 * `profilePictureUrl` (null when the user has none) and every mutation answers
 * with the new URL. This module caches that URL in memory and dispatches
 * `cvgen:avatar-changed` on every mutation, so the nav avatar, the profile
 * modal and the picker all re-read without prop drilling - same pattern as the
 * mock credits wallet. (The previous localStorage/data-URL implementation is
 * gone: uploads are real and follow the user across devices now.)
 *
 * Why cache at all, when the URL is also a JWT claim? Because the claim is a
 * snapshot from token-issue time. It survives refresh-token rotation now, so it
 * is a good *placeholder* while /api/users/me is in flight, but it goes stale
 * the moment the user changes or removes their picture. Server truth wins as
 * soon as it lands, which is what `loaded` tracks - `loaded: true, url: null`
 * means "we know there is no picture", and must NOT fall back to the claim.
 *
 * URLs are immutable and public: a new picture means a new fileId and a new
 * URL. So they can be cached freely and rendered in a plain <img src> - never
 * with an Authorization header (see Avatar) and never with a cache-buster.
 */

export const AVATAR_CHANGED_EVENT = 'cvgen:avatar-changed';

/** `loaded` distinguishes "not fetched yet" from "fetched, and there is none". */
let cache = { url: null, loaded: false };

function notify() {
  window.dispatchEvent(new Event(AVATAR_CHANGED_EVENT));
}

/** Server truth, once fetched: the URL, or null when the user has no picture. */
export function getAvatarUrl() {
  return cache.loaded ? cache.url : null;
}

/** Record the URL a profile fetch or a mutation returned. */
export function setAvatarUrl(url) {
  // Server truth can be a same-origin path rather than an absolute URL when
  // STORAGE_PUBLIC_BASE_URL is unset - see toFileUrl. Normalize once, here, so
  // no renderer has to know about it.
  cache = { url: toFileUrl(url), loaded: true };
  notify();
}

/** Forget server truth - used on sign-out so the next account starts clean. */
export function resetAvatar() {
  cache = { url: null, loaded: false };
  notify();
}

/**
 * The picture to actually render for `user` (the decoded JWT claims).
 *
 * Precedence: server truth if we have it, otherwise the token's own image claim
 * as a placeholder, otherwise nothing and the caller draws initials.
 */
export function resolveAvatar(user) {
  if (cache.loaded) return cache.url;
  return toFileUrl(user?.imageUrl || user?.picture || null);
}

/**
 * Pull the current picture from server truth.
 *
 * Used on app load and after OAuth sign-in. Seeding a provider picture at
 * first-time signup is ASYNCHRONOUS on the backend, so `profilePictureUrl` can
 * legitimately still be null for a few seconds after a first Google/GitHub/
 * LinkedIn login - `retryDelayMs` schedules one more read for that case rather
 * than leaving the user on initials until their next navigation. Nothing waits
 * on this: it never throws, and a failure just leaves the placeholder in place.
 *
 * @param {{ retryDelayMs?: number }} [options]
 * @returns {Promise<string|null>} the URL now known, or null
 */
export async function syncAvatarFromServer({ retryDelayMs = 0 } = {}) {
  if (!getAccessToken()) return null;

  let url = null;
  try {
    url = (await fetchCurrentUser())?.profilePictureUrl ?? null;
    setAvatarUrl(url);
  } catch {
    // Offline, expired session, anything - keep whatever we were already
    // showing. The avatar is never worth surfacing an error for.
    return getAvatarUrl();
  }

  if (!url && retryDelayMs > 0) {
    setTimeout(() => {
      syncAvatarFromServer();
    }, retryDelayMs);
  }

  return url;
}

/**
 * Fetch server truth once per session, and no more.
 *
 * Called from the nav on every authenticated page, which remounts on each
 * navigation - without this guard that would be a /api/users/me request per
 * page view for a value that only ever changes through this module. Changes
 * made in the picker land via setAvatarUrl(), not through here.
 */
export function ensureAvatarLoaded(options) {
  if (cache.loaded) return Promise.resolve(cache.url);
  return syncAvatarFromServer(options);
}

// Sign-out clears the in-memory access token; drop the cached picture with it
// so the next account on this browser never inherits the previous one's avatar.
// A token *rotation* keeps the cache deliberately - the rotated token's claim
// would be stale after a change, and server truth already sits here.
window.addEventListener(AUTH_CHANGED_EVENT, () => {
  if (!getAccessToken() && cache.loaded) resetAvatar();
});
