import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/config';

/**
 * AuthSuccess page — handles the OAuth callback after a successful identity
 * provider login. The backend redirects here with ?code=<exchangeCode>.
 * This page exchanges the code for an access token, then goes to /dashboard.
 *
 * The exchange code is single-use on the backend, so this effect must run
 * exactly once per code. React StrictMode double-invokes effects in dev, which
 * would otherwise burn the code on the first call and fail on the second — the
 * `hasRun` ref guards against that.
 *
 * Two things this call MUST get right against the verified backend
 * (AuthController.exchangeCode + TokenResponse):
 *   1. The JSON body is TokenResponse = { accessToken } ONLY. There is no
 *      refreshToken in the body — it's returned as an httpOnly Set-Cookie. So
 *      we require ONLY accessToken; gating on refreshToken (as the old code
 *      did) failed every correct response.
 *   2. `credentials: 'include'` is required, or the browser drops that
 *      Set-Cookie refresh cookie and the later /refresh flow can never work.
 *
 * This is the one deliberate raw-fetch exception to the "use the api instance"
 * rule: no access token exists yet at this point.
 */
export default function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('exchanging');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get('code');

    if (!code) {
      navigate('/login?error=exchange_failed', { replace: true });
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/oauth/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Exchange failed');
        }

        const data = await response.json();

        if (data.accessToken) {
          login({ accessToken: data.accessToken });
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
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {status === 'exchanging'
            ? 'Completing sign-in…'
            : 'Something went wrong. Redirecting…'}
        </p>
      </div>
    </div>
  );
}
