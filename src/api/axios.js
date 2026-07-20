import axios from 'axios';

import { API_BASE_URL } from '@/config';
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
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    // Use a bare axios call, NOT `api`, so this request doesn't recurse through
    // this same response interceptor if /refresh itself 401s.
    refreshPromise = axios
      .post(`${API_BASE_URL}/api/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const newToken = res.data?.accessToken;
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
 * On 401, attempt ONE refresh (POST /api/auth/refresh reads the httpOnly
 * refresh cookie, rotates it, returns a fresh access token) and retry the
 * original request once. If refresh fails — expired/rotated/missing cookie, or
 * a session that never had a refresh cookie (local login and OTP verify do not
 * set one on the current backend) — clear auth and bounce to /login.
 *
 * The `_retry` guard and the endpoint check prevent an infinite 401 loop.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes('/api/auth/refresh');

    if (status === 401 && original && !original._retry && !isRefreshCall) {
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
