import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import AuthShell from '@/components/AuthShell';
import OAuthButtons from '@/components/OAuthButtons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
 * Login page — local email/password sign-in with the OTP-required and
 * trusted-device branches, plus the OAuth providers.
 *
 * Backend /api/auth/login outcomes, keyed on the HTTP status (the old
 * `data.status` outcome strings are gone — `status` is now a boolean):
 *   200 data:{accessToken}      trusted device, sign in directly
 *   202 data:{email, purpose}   OTP challenge, go to the OTP screen
 *   401                         invalid credentials, inline on the password field
 *   400 error:[...]             validation failure, mapped onto the fields
 *
 * Failure wording comes from the response `message`, which the backend already
 * localizes; the literals here are network-level fallbacks only.
 *
 * Remember-this-device is NOT asked here. Only the OTP verification issues the
 * trusted-device token, so the choice is made on that screen — which also means
 * the 200 branch below (already-trusted device) never needs to ask at all.
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
            // Echo the purpose the backend chose rather than assuming LOGIN.
            purpose: data?.purpose || OTP_PURPOSE.LOGIN,
          },
        });
        return;
      }

      // Any other 2xx shape is unexpected given the verified contract.
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
      title="Sign in"
      description="Welcome back to CVgen"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {oauthError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {oauthError === 'exchange_failed'
            ? 'Sign-in failed. Please try again.'
            : decodeURIComponent(oauthError)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase text-muted-foreground">
          or
        </span>
      </div>

      <OAuthButtons disabled={isSubmitting} />
    </AuthShell>
  );
}
