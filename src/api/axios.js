import axios from 'axios';

import { API_BASE_URL } from '@/config';
import { unwrap, HTTP } from '@/api/response';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from '@/auth/tokenStore';

/**
 * Shared axios instance for authenticated API requests.
 *
 * withCredentials:true is REQUIRED, not optional — the backend issues the
 * refresh token and the trusted-device token as httpOnly cookies and its CORS
 * config runs with allowCredentials. Without this flag the browser silently
 * drops those cookies and both the /refresh flow and the skip-OTP
 * trusted-device flow can never work.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Attach the bearer access token to every request when one is present.
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Single-flight refresh: if several requests 401 at once, they all await the
 * same in-flight /refresh call rather than firing N of them.
 */
let refreshPromise = null;

/**
 * Mint a fresh access token from the httpOnly refresh cookie and store it.
 * Exported so the app-load bootstrap (AuthContext) can reuse the exact same
 * single-flight call the 401 interceptor uses — a bootstrap refresh racing an
 * early 401 will therefore share one in-flight request, not fire two. Rejects
 * if there is no valid refresh cookie; callers treat that as "logged out".
 *
 * The response is the standard envelope, so the token sits at `data.data`
 * (see api/response.js) — reading `data.accessToken` here silently yields
 * undefined and logs every session out on load.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    // Use a bare axios call, NOT `api`, so this request doesn't recurse through
    // this same response interceptor if /refresh itself 401s.
    refreshPromise = axios
      .post(`${API_BASE_URL}/api/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const newToken = unwrap(res)?.accessToken;
        if (!newToken) {
          throw new Error('Refresh response missing accessToken');
        }
        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Endpoints that are 401-able as a NORMAL outcome rather than as an expired
 * session. Since the backend cleanup, a wrong email/password answers 401
 * (it used to be 400) — if that fell through to the refresh-and-retry branch
 * below, a failed sign-in would trigger a bogus refresh, clear auth and
 * hard-navigate to /login, destroying the form and the error the user needs to
 * see. None of these calls carry an access token in the first place, so a
 * refresh could never help them.
 */
const UNAUTHENTICATED_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/otp/verify',
  '/api/auth/otp/resend',
  '/api/auth/oauth/exchange',
  '/api/auth/refresh',
  '/api/auth/logout',
];

/**
 * On 401, attempt ONE refresh (POST /api/auth/refresh reads the httpOnly
 * refresh cookie, rotates it, returns a fresh access token) and retry the
 * original request once. If refresh fails — expired, rotated or missing
 * cookie — clear auth and bounce to /login.
 *
 * The `_retry` guard and the endpoint list prevent an infinite 401 loop.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const url = original?.url || '';
    const isUnauthenticatedCall = UNAUTHENTICATED_ENDPOINTS.some((endpoint) =>
      url.includes(endpoint)
    );

    if (
      status === HTTP.UNAUTHORIZED &&
      original &&
      !original._retry &&
      !isUnauthenticatedCall
    ) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearAccessToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
