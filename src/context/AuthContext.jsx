import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { jwtDecode } from 'jwt-decode';

import { refreshAccessToken } from '@/api/axios';
import { logout as logoutRequest } from '@/api/auth';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  AUTH_CHANGED_EVENT,
} from '@/auth/tokenStore';

/**
 * AuthContext — the single source of auth state for the app.
 *
 * The access token is kept only in memory (via tokenStore) and decoded
 * client-side with jwt-decode purely to read display claims and the `exp`
 * expiry — the signature is verified by the backend, not here, which is
 * correct: the frontend only needs the claims, not to trust them.
 *
 * Because the access token is in-memory, it is gone after any page reload. The
 * durable session identity is the httpOnly refresh cookie, so on mount this
 * provider runs a ONE-SHOT bootstrap: it calls /api/auth/refresh once to try to
 * mint a fresh access token from that cookie. Until that call settles,
 * `bootstrapped` is false and route guards must wait — otherwise a reload would
 * momentarily look unauthenticated and bounce a valid session to /login before
 * the refresh could complete.
 *
 * The refresh token is NOT handled in JS — it's an httpOnly cookie the browser
 * holds. Ongoing token renewal happens transparently in the axios 401
 * interceptor; this bootstrap reuses that same single-flight refresh.
 */

const AuthContext = createContext(null);

function decodeUser(token) {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => decodeUser(getAccessToken()));
  const [bootstrapped, setBootstrapped] = useState(false);

  // Re-derive user state whenever the token changes (auth:changed, dispatched by
  // tokenStore including from the axios refresh interceptor and the bootstrap).
  // The token is in-memory and per-tab, so there is no cross-tab storage event.
  useEffect(() => {
    const sync = () => setUser(decodeUser(getAccessToken()));
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  // One-shot bootstrap: try to mint an access token from the httpOnly refresh
  // cookie on load. On success the refresh helper writes the token to tokenStore
  // (firing auth:changed → sync above); on failure there is simply no session.
  // Either way we flip `bootstrapped` so the route guards can render.
  useEffect(() => {
    let cancelled = false;
    refreshAccessToken()
      .catch(() => {
        // No valid refresh cookie — stay logged out. Not an error to surface.
      })
      .finally(() => {
        if (!cancelled) setBootstrapped(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Persist a freshly issued access token and update React state.
   * @param {{ accessToken: string }} tokens - backend TokenResponse shape.
   */
  const login = useCallback((tokens) => {
    setAccessToken(tokens.accessToken);
    setUser(decodeUser(tokens.accessToken));
  }, []);

  /**
   * Clear the session. Calls the backend so it can expire BOTH httpOnly cookies
   * — the refresh cookie and the trusted-device remember-me cookie, which
   * logout now also clears, so signing out really does re-arm the OTP challenge
   * on the next sign-in from this device. The response is 200 with the standard
   * envelope (it was 204 before); nothing is read from it. In-memory state is
   * cleared regardless of whether the call succeeds, so logout is never blocked
   * by the network.
   */
  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Best-effort — the cookie may already be gone or the server unreachable.
    }
    clearAccessToken();
    setUser(null);
  }, []);

  const isAuthenticated = Boolean(user) && user.exp * 1000 > Date.now();

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, bootstrapped, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
