import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { exchangeOAuthCode } from '@/api/auth';
import { unwrap } from '@/api/response';

/**
 * AuthSuccess page — handles the OAuth callback after a successful identity
 * provider login. The backend redirects here with ?code=<exchangeCode>.
 * This page exchanges the code for an access token, then goes to /dashboard.
 *
 * The exchange code is single-use on the backend and expires after 60s, so this
 * effect must run exactly once per code. React StrictMode double-invokes effects
 * in dev, which would otherwise burn the code on the first call and fail on the
 * second — the `hasRun` ref guards against that.
 *
 * Two things this call MUST get right against the backend
 * (AuthController.exchangeCode):
 *   1. The body is the GlobalApiResponse envelope, so the token is at
 *      `data.data.accessToken`. There is no refreshToken in the body at all —
 *      it comes back as an httpOnly Set-Cookie.
 *   2. Credentials must be sent, or the browser drops that Set-Cookie refresh
 *      cookie and the later /refresh flow can never work.
 *
 * This used to be a hand-rolled `fetch` because no access token exists yet at
 * this point. That exception is no longer needed: the shared `api` instance
 * only attaches an Authorization header when a token is present, already sets
 * withCredentials, and — since /api/auth/oauth/exchange is on the
 * unauthenticated list in api/axios.js — will not try to refresh-and-retry a
 * failed exchange.
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

    const exchange = async () => {
      try {
        const accessToken = unwrap(await exchangeOAuthCode(code))?.accessToken;

        if (!accessToken) {
          throw new Error('Exchange response missing accessToken');
        }

        login({ accessToken });
        navigate('/dashboard', { replace: true });
      } catch {
        setStatus('error');
        navigate('/login?error=exchange_failed', { replace: true });
      }
    };

    exchange();
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
