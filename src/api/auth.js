import api from '@/api/axios';

/**
 * Thin wrappers over the backend local-auth contract (LocalAuthController).
 * All calls go through the shared `api` instance so withCredentials is applied
 * — required for the trusted-device cookie to be sent on login and set on
 * verify. Callers handle the thrown axios error and read
 * `error.response.data.status` for the documented failure codes.
 *
 * Response bodies:
 *   signup   → 202 OtpResponse { status:"OTP_SENT", email }
 *              400 OtpResponse { status:"ALREADY_REGISTERED", email }
 *   login    → 200 TokenResponse { accessToken }            (trusted device)
 *              202 OtpResponse   { status:"OTP_REQUIRED", email }
 *              400 OtpResponse   { status:"INVALID_CREDENTIALS", email }
 *   verify   → 200 TokenResponse { accessToken }
 *              400 OtpResponse   { status:"INVALID_OTP", email }
 *   resend   → 202 OtpResponse { status:"OTP_SENT", email }
 *              400 OtpResponse { status:"RESEND_COOLDOWN", email }
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
