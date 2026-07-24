/**
 * Helpers for the backend's single response envelope.
 *
 * Every endpoint — success or failure, controller or security filter — now
 * answers with `GlobalApiResponse`:
 *
 *   { status: boolean, message: string, data: T | null, error?: string[] }
 *
 * Two consequences the whole frontend depends on:
 *
 *  1. The payload is nested one level deeper than it used to be. `accessToken`
 *     is at `response.data.data.accessToken`, NOT `response.data.accessToken`.
 *     Read it through `unwrap()` so no call site has to spell out `.data.data`.
 *
 *  2. `status` is a BOOLEAN, not the old machine-readable outcome string
 *     ("OTP_SENT" / "INVALID_CREDENTIALS" / …). Those codes no longer exist
 *     anywhere in the backend, so branching on them is dead code. The outcome
 *     is now carried by the HTTP status code (see HTTP below) and the
 *     human-facing wording by `message`, which the backend resolves from
 *     `messages.properties` for the caller's locale. That means the message is
 *     the localized, user-safe text — surface it directly rather than
 *     hardcoding an English copy that will drift.
 */

/** HTTP statuses the auth contract actually distinguishes. */
export const HTTP = {
  OK: 200,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
};

/** Payload of a successful response, or null when the endpoint returns none. */
export function unwrap(response) {
  return response?.data?.data ?? null;
}

/** Localized wording the backend attached to a response (success or failure). */
export function apiMessage(errorOrResponse, fallback) {
  const message =
    errorOrResponse?.response?.data?.message ?? errorOrResponse?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

/** HTTP status of a rejected axios call, or undefined if the request never landed. */
export function apiStatus(error) {
  return error?.response?.status;
}

/**
 * Field-level validation failures, as returned by GlobalExceptionHandler for
 * `MethodArgumentNotValidException`: a flat `error` array of `"field: message"`
 * strings. Returns `{ field: message }`; entries without a `field:` prefix are
 * skipped (they belong in a toast, not on an input).
 */
export function fieldErrors(error) {
  const errors = error?.response?.data?.error;
  if (!Array.isArray(errors)) return {};

  return errors.reduce((accumulator, entry) => {
    if (typeof entry !== 'string') return accumulator;
    const separator = entry.indexOf(':');
    if (separator <= 0) return accumulator;

    const field = entry.slice(0, separator).trim();
    const message = entry.slice(separator + 1).trim();
    if (field && message && !accumulator[field]) {
      accumulator[field] = message;
    }
    return accumulator;
  }, {});
}

/**
 * Push backend validation failures onto the matching react-hook-form fields.
 *
 * @param {unknown} error axios rejection
 * @param {(name: string, error: object) => void} setError react-hook-form setError
 * @param {string[]} formFields fields this form actually renders — anything the
 *   backend complains about that isn't here has no input to attach to, so it
 *   must stay unhandled and be surfaced as a toast by the caller instead.
 * @returns {boolean} whether at least one message was attached
 */
export function applyFieldErrors(error, setError, formFields) {
  const errors = fieldErrors(error);
  let applied = false;

  formFields.forEach((field) => {
    if (errors[field]) {
      setError(field, { type: 'server', message: errors[field] });
      applied = true;
    }
  });

  return applied;
}
