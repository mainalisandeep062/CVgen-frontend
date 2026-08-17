import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import OAuthButtons from '@/components/OAuthButtons';
import { useAuth } from '@/context/AuthContext';
import { login as loginRequest } from '@/api/auth';
import {
  HTTP,
  unwrap,
  apiMessage,
  apiStatus,
  applyFieldErrors,
} from '@/api/response';
import { OTP_PURPOSE } from '@/config';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Login page — mock template's split-panel auth design (.auth-page), with the
 * REAL backend sign-in logic preserved unchanged:
 *   200 data:{accessToken}    trusted device, sign in directly
 *   202 data:{email, purpose} OTP challenge, go to the OTP screen
 *   401                       invalid credentials, inline on the password field
 *   400 error:[...]           validation failure, mapped onto the fields
 * OAuth buttons kick off the real backend /oauth2/authorization/{provider}
 * redirect chain (config.js) — the provider list in OAuthButtons stays driven
 * by OAUTH_PROVIDERS in config.js as the source of truth.
 */
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login } = useAuth();

  // ?error= arrives from AuthSuccess when the OAuth code exchange fails.
  const oauthError = searchParams.get('error');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      const res = await loginRequest(values);
      const data = unwrap(res);

      if (res.status === HTTP.OK && data?.accessToken) {
        // Trusted device — OTP skipped.
        login({ accessToken: data.accessToken });
        navigate('/dashboard', { replace: true });
        return;
      }

      if (res.status === HTTP.ACCEPTED) {
        navigate('/verify-otp', {
          replace: true,
          state: {
            email: data?.email || values.email,
            purpose: data?.purpose || OTP_PURPOSE.LOGIN,
          },
        });
        return;
      }

      toast.error('Unexpected response from server. Please try again.');
    } catch (err) {
      const status = apiStatus(err);

      if (status === HTTP.UNAUTHORIZED) {
        setError('password', {
          type: 'server',
          message: apiMessage(err, 'Invalid email or password.'),
        });
        return;
      }

      if (
        status === HTTP.BAD_REQUEST &&
        applyFieldErrors(err, setError, ['email', 'password'])
      ) {
        return;
      }

      toast.error(apiMessage(err, 'Could not sign in. Please try again.'));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            CVGen
          </div>
          <h2>
            Your CV should get you the interview.
            <br />
            Not rejected by a parser.
          </h2>
          <p>
            Most CVs are silently dropped before a human ever reads them. CVGen
            helps you build machine-readable, keyword-smart resumes with
            transparent analysis — so you know exactly where you stand.
          </p>

          <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              ['📄', 'Pixel-perfect PDF export', 'Same HTML for preview and export'],
              ['🎯', 'CV Match Analysis', 'Keyword coverage, not gamified scores'],
              ['💳', 'Local payments', 'eSewa, Khalti, ConnectIPS'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-visual-footer">© 2026 CVGen · Texas International College</div>
      </div>

      <div className="auth-form-panel">
        <Link to="/" className="auth-logo">
          CVGen
        </Link>
        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to build, analyze, and export your CVs.</p>

        {oauthError && (
          <div
            role="alert"
            className="p-3 rounded-md mb-4 text-sm"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca' }}
          >
            {oauthError === 'exchange_failed'
              ? 'Sign-in failed. Please try again.'
              : decodeURIComponent(oauthError)}
          </div>
        )}

        <OAuthButtons disabled={isSubmitting} />

        <div className="auth-divider">or</div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.email.message}</p>
            )}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.password.message}</p>
            )}
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign In with Email'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--fg)', fontWeight: 500 }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
