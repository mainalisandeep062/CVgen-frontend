import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * AuthContext - Manages authentication state for the OAuth login shell.
 *
 * NOTE: sessionStorage is used here for the dev-flow build. In production,
 * access tokens should be stored in httpOnly cookies (requires backend changes)
 * to prevent XSS attacks. This is out of scope for the current build.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    try {
      return sessionStorage.getItem('accessToken') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const token = sessionStorage.getItem('accessToken');
      return token ? jwtDecode(token) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((tokens) => {
    // tokens = { accessToken, refreshToken }
    sessionStorage.setItem('accessToken', tokens.accessToken);
    // refreshToken is stored but currently unused — no refresh endpoint exists on the backend.
    // When the access token expires, the user must log in again via OAuth.
    sessionStorage.setItem('refreshToken', tokens.refreshToken);

    const decoded = jwtDecode(tokens.accessToken);
    setAccessToken(tokens.accessToken);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    setAccessToken(null);
    setUser(null);
  }, []);

  // Sync auth state across tabs (optional UX improvement)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'accessToken') {
        if (e.newValue) {
          setAccessToken(e.newValue);
          try {
            setUser(jwtDecode(e.newValue));
          } catch {
            setUser(null);
          }
        } else {
          setAccessToken(null);
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isAuthenticated = Boolean(accessToken) && user && user.exp * 1000 > Date.now();

  return (
    <AuthContext.Provider value={{ accessToken, user, isAuthenticated, login, logout }}>
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
