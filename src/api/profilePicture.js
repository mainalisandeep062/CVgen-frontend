import api from '@/api/axios';
import { unwrap } from '@/api/response';

/**
 * Profile-picture endpoints (UserProfilePictureController).
 *
 * Every response is the GlobalApiResponse envelope, so payloads come out of
 * `data.data` via unwrap() and the user-facing wording out of `message` — the
 * backend already localized it, so never replace it with hardcoded English.
 * The mutations therefore return the raw axios response rather than the
 * unwrapped payload: call sites need BOTH the new picture (for the avatar) and
 * the message (for the toast).
 *
 * The picture URL itself is public, immutable and cacheable: picking a
 * different picture mints a new fileId and so a new URL. Always re-read the URL
 * from the response after a change — never cache-bust the old one.
 */

/** Server limit (MultipartProperties / the 400 the controller answers with). */
export const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024;

/** Content types the server accepts. Mirrored on the input's `accept` too. */
export const PROFILE_PICTURE_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** Value for `<input type="file" accept>`, same list as above. */
export const PROFILE_PICTURE_ACCEPT_ATTRIBUTE =
  PROFILE_PICTURE_ACCEPTED_TYPES.join(',');

/**
 * Pre-flight the same two rules the server enforces, so an obviously bad file
 * fails instantly instead of after a 2 MB upload. The server stays the
 * authority — its 400 message is surfaced verbatim when one slips through.
 *
 * @returns {string|null} a reason to show the user, or null when the file is fine
 */
export function validateProfilePicture(file) {
  if (!file) return 'No file selected.';
  if (!PROFILE_PICTURE_ACCEPTED_TYPES.includes(file.type)) {
    return 'Pick a JPEG, PNG, WebP or GIF image.';
  }
  if (file.size > PROFILE_PICTURE_MAX_BYTES) {
    return 'That image is over 2 MB — pick a smaller one.';
  }
  return null;
}

/**
 * The whole picker payload in one call:
 *
 *   { current: { fileId, url, sourceProvider },
 *     providerOptions: [{ identityId, provider, avatarUrl, selected }] }
 *
 * `providerOptions` is one entry per linked account that publishes an avatar,
 * and is EMPTY for an email/password-only account — the modal must still work
 * with upload as its only option. `avatarUrl` points at the provider's CDN and
 * is for the thumbnail alone; it is not what gets stored.
 */
export async function fetchProfilePictureOptions() {
  return unwrap(await api.get('/api/users/me/profile-picture/options'));
}

/**
 * Adopt a linked provider's picture. No body.
 *
 * This is slower than a normal PUT: the server downloads the image from the
 * provider CDN and stores it before answering, so the caller must show progress
 * rather than assume it is instant. data: { fileId, url, sourceProvider }.
 */
export function selectProfilePictureFromIdentity(identityId) {
  return api.put(
    `/api/users/me/profile-picture/from-identity/${encodeURIComponent(identityId)}`
  );
}

/**
 * Upload a picture. multipart/form-data, field name exactly "file".
 *
 * Content-Type is deliberately NOT set: the browser has to add it itself so it
 * can append the multipart boundary. Setting it by hand produces a body the
 * server cannot parse. data: { fileId, url, sourceProvider }.
 */
export function uploadProfilePicture(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/api/users/me/profile-picture', form);
}

/** Drop the current picture. data: null — the user falls back to initials. */
export function deleteProfilePicture() {
  return api.delete('/api/users/me/profile-picture');
}

/**
 * Just the URL (or null), without the rest of the profile. Cheaper than
 * /api/users/me when a header avatar is all that needs filling in.
 */
export async function fetchProfilePictureUrl() {
  return unwrap(await api.get('/api/users/profile-picture-url'));
}
