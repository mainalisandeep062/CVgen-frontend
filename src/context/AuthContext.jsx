import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { jwtDecode } from 'jwt-decode';

import api from '@/api/axios';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  AUTH_CHANGED_EVENT,
} from '@/auth/tokenStore';

/**
 * AuthContext — the single source of auth state for the app.
 *
 * The access token is kept in sessionStorage (via tokenStore) and decoded
 * client-side with jwt-decode purely to read display claims and the `exp`
 * expiry — the signature is verified by the backend, not here, which is
 * correct: the frontend only needs the claims, not to trust them.
 *
 * NOTE: sessionStorage is a deliberate dev-flow choice, not hardened storage.
 * A production build would keep the access token out of JS-readable storage
 * too; that's a backend-coupled change and out of scope here.
 *
 * The refresh token is NOT handled in JS — it's an httpOnly cookie the browser
 * holds. Token renewal happens transparently in the axios 401 interceptor.
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

  // Re-derive user state whenever the token changes — same tab (auth:changed,
  // dispatched by tokenStore including from the axios refresh interceptor) or
  // another tab (native storage event).
  useEffect(() => {
    const sync = () => setUser(decodeUser(getAccessToken()));
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
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
   * Clear the session. Calls the backend so it can expire the httpOnly refresh
   * cookie (POST /api/auth/logout → 204); local storage is cleared regardless
   * of whether that call succeeds, so logout is never blocked by the network.
   */
  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Best-effort — the cookie may already be gone or the server unreachable.
    }
    clearAccessToken();
    setUser(null);
  }, []);

  const isAuthenticated = Boolean(user) && user.exp * 1000 > Date.now();

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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
