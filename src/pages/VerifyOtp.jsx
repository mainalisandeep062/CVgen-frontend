import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
 * (purpose SIGNUP). Only email and purpose arrive via router state — there's no
 * way to land here meaningfully without them, so a direct visit bounces back to
 * /login.
 *
 * Remember-this-device is owned by THIS screen, for both purposes. It used to be
 * a checkbox on Login that was ferried through router state, which put the choice
 * on a page that cannot act on it: /api/auth/login never issues a trusted-device
 * token, only /api/auth/otp/verify does. Asking here also puts it where it makes
 * sense to the user — next to the code they just had to fetch from their inbox.
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
  const { email, purpose } = state;

  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
        const res = await verifyOtp({ email, purpose, code: value, rememberMe });

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

  /**
   * Typing the last digit deliberately does NOT verify. A paste or a mistyped
   * digit used to fire the request instantly, burning one of the 5 server-side
   * attempts before the user could read what they had entered. Submission is
   * explicit: Enter (the form submit) or the Verify button.
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    submit(code);
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
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center space-y-6"
      >
        <InputOTP
          maxLength={OTP_LENGTH}
          value={code}
          onChange={setCode}
          disabled={submitting}
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div className="flex w-full items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            disabled={submitting}
          />
          <Label htmlFor="rememberMe" className="font-normal">
            Remember this device for 30 days
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={code.length !== OTP_LENGTH || submitting}
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
      </form>
    </AuthShell>
  );
}
