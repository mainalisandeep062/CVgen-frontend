/**
 * Single source of truth for backend origin and derived URLs.
 *
 * Previously `http://localhost:8080` was hard-coded inline in axios.js,
 * AuthSuccess.jsx and Login.jsx; consolidated here so the three call sites
 * can't drift. Override with VITE_API_BASE_URL at build time.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** Supported OAuth2 providers — must match backend client registrations. */
export const OAUTH_PROVIDERS = ['google', 'github', 'linkedin'];

/**
 * Full browser-navigation URL that kicks off the backend OAuth2 redirect chain.
 * This is NEVER fetched — it's a multi-hop 302 chain through the identity
 * provider, so it must be a real `window.location` navigation.
 */
export function oauthAuthorizeUrl(provider) {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`;
}

/** OTP purpose constants — literal strings the backend's OtpService expects. */
export const OTP_PURPOSE = {
  SIGNUP: 'SIGNUP',
  LOGIN: 'LOGIN',
};

/** Backend OTP resend cooldown, in seconds (OtpService.RESEND_COOLDOWN). */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Backend OTP length (OtpService.OTP_LENGTH). */
export const OTP_LENGTH = 6;
