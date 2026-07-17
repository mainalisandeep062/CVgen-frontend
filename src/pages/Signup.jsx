import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import AuthShell from '@/components/AuthShell';
import OAuthButtons from '@/components/OAuthButtons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { signup as signupRequest } from '@/api/auth';
import { OTP_PURPOSE } from '@/config';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Signup page — local email/password registration.
 *
 * Backend /api/auth/signup outcomes:
 *   202 OtpResponse{status:"OTP_SENT"}          → go to OTP screen (SIGNUP)
 *   400 OtpResponse{status:"ALREADY_REGISTERED"} → inline error on email
 *
 * NOTE on the password minimum: the backend does NOT enforce a length rule
 * (SignUpRequestDto only requires @NotBlank), so this 8-char minimum is a
 * frontend-only UX guard, not a mirror of a backend constraint.
 */
export default function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      const res = await signupRequest(values);

      if (res.data?.status === 'OTP_SENT') {
        navigate('/verify-otp', {
          replace: true,
          state: {
            email: values.email,
            purpose: OTP_PURPOSE.SIGNUP,
            rememberMe: false,
          },
        });
        return;
      }

      toast.error('Unexpected response from server. Please try again.');
    } catch (err) {
      const status = err.response?.data?.status;
      if (status === 'ALREADY_REGISTERED') {
        setError('email', {
          type: 'server',
          message: 'An account with this email already exists.',
        });
      } else {
        toast.error('Could not create your account. Please try again.');
      }
    }
  };

  return (
    <AuthShell
      title="Create account"
      description="Start building your CV with CVgen"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Create account
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
