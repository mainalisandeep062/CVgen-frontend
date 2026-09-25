import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import AuthShell, { PasswordInput } from '@/components/AuthShell';
import OAuthButtons from '@/components/OAuthButtons';
import { useAuth } from '@/context/AuthContext';
import { signup as signupRequest } from '@/api/auth';
import {
  HTTP,
  unwrap,
  apiMessage,
  apiStatus,
  applyFieldErrors,
} from '@/api/response';
import {
  OTP_PURPOSE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '@/config';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    )
    .max(
      PASSWORD_MAX_LENGTH,
      `Password must be at most ${PASSWORD_MAX_LENGTH} characters`
    ),
});

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

/**
 * Purely visual password strength: length plus character classes, bucketed
 * into 0–4 bars. It never blocks submission - the zod schema (mirroring the
 * backend's @Size) is the only real rule.
 */
function passwordStrength(pw) {
  if (!pw) return 0;
  let points = 0;
  if (pw.length >= PASSWORD_MIN_LENGTH) points += 1;
  if (pw.length >= 12) points += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) points += 1;
  if (/\d/.test(pw)) points += 1;
  if (/[^A-Za-z0-9]/.test(pw)) points += 1;
  if (pw.length < PASSWORD_MIN_LENGTH) return 1;
  return Math.max(1, Math.min(4, points));
}

function StrengthMeter({ password }) {
  const level = passwordStrength(password);
  return (
    <div className="au-strength" data-level={level}>
      <div className="au-strength-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`au-strength-bar${n <= level ? ' on' : ''}`} />
        ))}
      </div>
      <span className="au-strength-label" aria-live="polite">
        {level ? STRENGTH_LABELS[level] : ''}
        <span className="sr-only">{level ? ' password' : ''}</span>
      </span>
    </div>
  );
}

/**
 * Signup page - local email/password registration.
 *
 * Backend /api/auth/signup outcomes:
 *   202 data:{email, purpose:"SIGNUP"}  code mailed, go to the OTP screen
 *   409                                 email already registered, inline on email
 *   400 error:[...]                     validation failure, mapped onto the fields
 *
 * The password rule is no longer frontend-only: SignUpRequestDto now carries
 * `@Size(min = 8, max = 72)`, so the bounds in the zod schema mirror a real
 * server constraint (PASSWORD_MIN_LENGTH / PASSWORD_MAX_LENGTH in config).
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const password = watch('password');

  const onSubmit = async (values) => {
    try {
      const res = await signupRequest(values);
      const data = unwrap(res);

      if (res.status === HTTP.ACCEPTED) {
        navigate('/verify-otp', {
          replace: true,
          state: {
            email: data?.email || values.email,
            purpose: data?.purpose || OTP_PURPOSE.SIGNUP,
          },
        });
        return;
      }

      toast.error('Unexpected response from server. Please try again.');
    } catch (err) {
      const status = apiStatus(err);

      if (status === HTTP.CONFLICT) {
        setError('email', {
          type: 'server',
          message: apiMessage(err, 'An account with this email already exists.'),
        });
        return;
      }

      if (
        status === HTTP.BAD_REQUEST &&
        applyFieldErrors(err, setError, ['name', 'email', 'password'])
      ) {
        return;
      }

      toast.error(
        apiMessage(err, 'Could not create your account. Please try again.')
      );
    }
  };

  return (
    <AuthShell
      title="Create account"
      description="Start building your CV with CVGen"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-link">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group">
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            className="input"
            autoComplete="name"
            placeholder="Jane Doe"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          {errors.name && <p id="name-error" className="field-error">{errors.name.message}</p>}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="email">Email</label>
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
            autoComplete="new-password"
            placeholder="Create a password"
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            {...register('password')}
          />
          <StrengthMeter password={password} />
          {errors.password ? (
            <p id="password-error" className="field-error">{errors.password.message}</p>
          ) : (
            <p id="password-hint" className="field-hint">
              At least {PASSWORD_MIN_LENGTH} characters
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-lg au-submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="spin" aria-hidden="true" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="au-divider">or</div>

      <OAuthButtons disabled={isSubmitting} />
    </AuthShell>
  );
}
