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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { login as loginRequest } from '@/api/auth';
import { OTP_PURPOSE } from '@/config';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

/**
 * Login page — local email/password sign-in with the OTP-required and
 * trusted-device branches, plus the OAuth providers.
 *
 * Backend /api/auth/login outcomes:
 *   200 TokenResponse{accessToken}          → trusted device, sign in directly
 *   202 OtpResponse{status:"OTP_REQUIRED"}  → go to OTP screen (purpose LOGIN)
 *   400 OtpResponse{status:"INVALID_CREDENTIALS"} → inline error
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
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (values) => {
    try {
      const res = await loginRequest(values);

      if (res.status === 200 && res.data?.accessToken) {
        // Trusted device — OTP skipped.
        login({ accessToken: res.data.accessToken });
        navigate('/dashboard', { replace: true });
        return;
      }

      if (res.data?.status === 'OTP_REQUIRED') {
        navigate('/verify-otp', {
          replace: true,
          state: {
            email: values.email,
            purpose: OTP_PURPOSE.LOGIN,
            rememberMe: Boolean(values.rememberMe),
          },
        });
        return;
      }

      // Any other 2xx shape is unexpected given the verified contract.
      toast.error('Unexpected response from server. Please try again.');
    } catch (err) {
      const status = err.response?.data?.status;
      if (status === 'INVALID_CREDENTIALS') {
        setError('password', {
          type: 'server',
          message: 'Invalid email or password.',
        });
      } else {
        toast.error('Could not sign in. Please try again.');
      }
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

        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) =>
              setValue('rememberMe', checked === true)
            }
          />
          <Label htmlFor="rememberMe" className="font-normal">
            Remember this device for 30 days
          </Label>
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
