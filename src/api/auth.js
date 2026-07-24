import api from '@/api/axios';

/**
 * Thin wrappers over the backend auth contract (LocalAuthController +
 * AuthController). All calls go through the shared `api` instance so
 * withCredentials is applied — required for the httpOnly refresh cookie and the
 * trusted-device cookie to be sent and set.
 *
 * Every response — success or failure — is the GlobalApiResponse envelope
 * described in api/response.js. The old outcome strings ("OTP_SENT",
 * "INVALID_CREDENTIALS", …) no longer exist: outcomes are HTTP status codes and
 * wording comes from the localized `message` field.
 *
 *   signup  POST /api/auth/signup
 *             202 data: { email, purpose:"SIGNUP" }   code mailed
 *             409                                     email already registered
 *             400 error:[...]                         validation failed
 *
 *   login   POST /api/auth/login
 *             200 data: { accessToken }               trusted device, OTP skipped
 *             202 data: { email, purpose:"LOGIN" }    OTP challenge, code mailed
 *             401                                     invalid credentials
 *
 *   verify  POST /api/auth/otp/verify
 *             200 data: { accessToken }               + refresh cookie, and the
 *                                                     trusted-device cookie when
 *                                                     rememberMe was set
 *             400                                     wrong / expired / too many attempts
 *
 *   resend  POST /api/auth/otp/resend
 *             202 data: { email, purpose }
 *             429                                     still inside the 60s cooldown
 *
 *   logout  POST /api/auth/logout
 *             200                                     clears both cookies
 *
 * `purpose` is now a backend enum (OtpPurpose), so only the exact strings
 * "SIGNUP" and "LOGIN" deserialize — anything else is a 400, not a silent
 * mismatch. Send OTP_PURPOSE from config, never a hand-written literal.
 */

export function signup({ email, password, name }) {
  return api.post('/api/auth/signup', { email, password, name });
}

export function login({ email, password, rememberMe }) {
  return api.post('/api/auth/login', { email, password, rememberMe });
}

export function verifyOtp({ email, purpose, code, rememberMe }) {
  return api.post('/api/auth/otp/verify', {
    email,
    purpose,
    code,
    rememberMe,
  });
}

export function resendOtp({ email, purpose }) {
  return api.post('/api/auth/otp/resend', { email, purpose });
}

/** Exchange the single-use OAuth code for tokens. No access token exists yet. */
export function exchangeOAuthCode(code) {
  return api.post('/api/auth/oauth/exchange', { code });
}

export function logout() {
  return api.post('/api/auth/logout');
}
