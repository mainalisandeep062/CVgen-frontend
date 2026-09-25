import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';

import AuthShell, { PasswordInput } from '@/components/AuthShell';
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

/** decodeURIComponent that never throws on a stray `%` in the query string. */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Login page - shared AuthShell split layout, with the REAL backend sign-in
 * logic preserved unchanged:
 *   200 data:{accessToken}    trusted device, sign in directly
 *   202 data:{email, purpose} OTP challenge, go to the OTP screen
 *   401                       invalid credentials, inline on the password field
 *   400 error:[...]           validation failure, mapped onto the fields
 * OAuth buttons kick off the real backend /oauth2/authorization/{provider}
 * redirect chain (config.js) - the provider list in OAuthButtons stays driven
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
        // Trusted device - OTP skipped.
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
    <AuthShell
      title="Welcome back"
      description="Sign in to build, analyze, and export your CVs."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-link">
            Sign up
          </Link>
        </>
      }
    >
      {oauthError && (
        <div role="alert" className="alert alert-danger">
          <AlertCircle aria-hidden="true" />
          <span>
            {oauthError === 'exchange_failed'
              ? 'Sign-in failed. Please try again.'
              : safeDecode(oauthError)}
          </span>
        </div>
      )}

      <OAuthButtons disabled={isSubmitting} />

      <div className="au-divider">or</div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group">
          <label className="label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && <p id="email-error" className="field-error">{errors.email.message}</p>}
        </div>
        <div className="form-group">
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && <p id="password-error" className="field-error">{errors.password.message}</p>}
        </div>
        <button type="submit" className="btn btn-primary btn-lg au-submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="spin" aria-hidden="true" />}
          {isSubmitting ? 'Signing in…' : 'Sign in with email'}
        </button>
      </form>
    </AuthShell>
  );
}
