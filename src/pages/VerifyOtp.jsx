import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAuth } from '@/context/AuthContext';
import { verifyOtp, resendOtp } from '@/api/auth';
import { HTTP, unwrap, apiMessage, apiStatus } from '@/api/response';
import { OTP_LENGTH, OTP_PURPOSE, OTP_RESEND_COOLDOWN_SECONDS } from '@/config';

/**
 * OTP verification screen, reached from Login (purpose LOGIN) or Signup
 * (purpose SIGNUP). The email/purpose/rememberMe context arrives via router
 * state — there's no way to land here meaningfully without it, so a direct
 * visit bounces back to /login.
 *
 * Backend /api/auth/otp/verify outcomes:
 *   200 data:{accessToken}  signed in; on rememberMe the backend also sets the
 *                           trusted-device cookie
 *   400                     wrong / expired / too-many-attempts
 *
 * IMPORTANT: the backend's OtpService.verify() returns a single boolean, so a
 * wrong code, an expired code (10 min), and exceeding the 5-attempt cap all
 * collapse into the SAME 400 response. The frontend genuinely cannot tell them
 * apart — the backend's own message is deliberately general for that reason, so
 * it is shown as-is rather than being re-guessed here.
 *
 * Resend answers 202 on success and 429 while the 60s cooldown is still open.
 */
export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const state = location.state || {};
  const { email, purpose, rememberMe } = state;

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(OTP_RESEND_COOLDOWN_SECONDS);

  // Missing context → nothing to verify against.
  useEffect(() => {
    if (!email || !purpose) {
      navigate('/login', { replace: true });
    }
  }, [email, purpose, navigate]);

  // Resend cooldown countdown. Seeded at 60s because Login/Signup have just
  // triggered a send; mirrors OtpService.RESEND_COOLDOWN.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const submit = useCallback(
    async (value) => {
      if (value.length !== OTP_LENGTH || submitting) return;
      setSubmitting(true);
      try {
        const res = await verifyOtp({
          email,
          purpose,
          code: value,
          rememberMe: Boolean(rememberMe),
        });

        const data = unwrap(res);

        if (res.status === HTTP.OK && data?.accessToken) {
          login({ accessToken: data.accessToken });
          navigate('/dashboard', { replace: true });
          return;
        }

        toast.error('Unexpected response from server. Please try again.');
      } catch (err) {
        toast.error(
          apiMessage(err, 'Could not verify the code. Please try again.')
        );
        setCode('');
      } finally {
        setSubmitting(false);
      }
    },
    [email, purpose, rememberMe, submitting, login, navigate]
  );

  const handleChange = (value) => {
    setCode(value);
    if (value.length === OTP_LENGTH) {
      submit(value);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await resendOtp({ email, purpose });
      toast.success(
        apiMessage(res, 'A new code has been sent to your email.')
      );
      setCode('');
      setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (apiStatus(err) === HTTP.TOO_MANY_REQUESTS) {
        // Server-side cooldown still open — resync the local countdown with it.
        toast.info(apiMessage(err, 'Please wait before requesting another code.'));
        setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      } else {
        toast.error(apiMessage(err, 'Could not resend the code. Please try again.'));
      }
    } finally {
      setResending(false);
    }
  };

  if (!email || !purpose) {
    return null;
  }

  const title =
    purpose === OTP_PURPOSE.SIGNUP ? 'Verify your email' : 'Enter your code';

  return (
    <AuthShell
      title={title}
      description={`We sent a ${OTP_LENGTH}-digit code to ${email}`}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center space-y-6">
        <InputOTP
          maxLength={OTP_LENGTH}
          value={code}
          onChange={handleChange}
          disabled={submitting}
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <Button
          type="button"
          className="w-full"
          disabled={code.length !== OTP_LENGTH || submitting}
          onClick={() => submit(code)}
        >
          {submitting && <Loader2 className="animate-spin" />}
          Verify
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
