import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AuthSuccess page - handles the OAuth callback after successful identity provider login.
 *
 * The backend redirects here with ?code=<exchangeCode>.
 * This page exchanges the code for JWT tokens, then redirects to /dashboard.
 */

export default function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('exchanging');

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      navigate('/login?error=exchange_failed', { replace: true });
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/auth/oauth/exchange`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          // On any non-200, redirect with generic error.
          // Note: Spring Boot returns { timestamp, status, error, path } — no "message" field.
          throw new Error('Exchange failed');
        }

        const data = await response.json();

        if (data.accessToken && data.refreshToken) {
          login({ accessToken: data.accessToken, refreshToken: data.refreshToken });
          navigate('/dashboard', { replace: true });
        } else {
          throw new Error('Invalid token response');
        }
      } catch {
        setStatus('error');
        navigate('/login?error=exchange_failed', { replace: true });
      }
    };

    exchangeCode();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">
          {status === 'exchanging' ? 'Completing sign-in...' : 'Something went wrong. Redirecting...'}
        </p>
      </div>
    </div>
  );
}
