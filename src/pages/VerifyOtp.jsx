import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';

import AuthShell from '@/components/AuthShell';
import { useAuth } from '@/context/AuthContext';
import { verifyOtp, resendOtp } from '@/api/auth';
import { HTTP, unwrap, apiMessage, apiStatus } from '@/api/response';
import { OTP_LENGTH, OTP_PURPOSE, OTP_RESEND_COOLDOWN_SECONDS } from '@/config';

/**
 * OTP verification screen, reached from Login (purpose LOGIN) or Signup
 * (purpose SIGNUP). Only email and purpose arrive via router state - there's no
 * way to land here meaningfully without them, so a direct visit bounces back to
 * /login.
 *
 * Remember-this-device is owned by THIS screen, for both purposes. It used to be
 * a checkbox on Login that was ferried through router state, which put the choice
 * on a page that cannot act on it: /api/auth/login never issues a trusted-device
 * token, only /api/auth/otp/verify does. Asking here also puts it where it makes
 * sense to the user - next to the code they just had to fetch from their inbox.
 *
 * Backend /api/auth/otp/verify outcomes:
 *   200 data:{accessToken}  signed in; on rememberMe the backend also sets the
 *                           trusted-device cookie
 *   400                     wrong / expired / too-many-attempts
 *
 * IMPORTANT: the backend's OtpService.verify() returns a single boolean, so a
 * wrong code, an expired code (10 min), and exceeding the 5-attempt cap all
 * collapse into the SAME 400 response. The frontend genuinely cannot tell them
 * apart - the backend's own message is deliberately general for that reason, so
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

  const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(''));
  const code = digits.join('');
  const boxRefs = useRef([]);

  const focusBox = useCallback((i) => {
    const el = boxRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))];
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  // Set when the code is cleared (failed verify / resend); the effect below
  // moves focus back to the first box once the inputs are enabled again.
  const refocusPending = useRef(false);
  const resetCode = useCallback(() => {
    setDigits(Array(OTP_LENGTH).fill(''));
    refocusPending.current = true;
  }, []);

  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(OTP_RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (refocusPending.current && !submitting) {
      refocusPending.current = false;
      focusBox(0);
    }
  }, [digits, submitting, focusBox]);

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
        resetCode();
      } finally {
        setSubmitting(false);
      }
    },
    [email, purpose, rememberMe, submitting, login, navigate, resetCode]
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

  /** Writes `value`'s digits into the boxes starting at `start`. */
  const fillFrom = (start, value) => {
    const incoming = value.replace(/\D/g, '').slice(0, OTP_LENGTH - start);
    if (!incoming) return;
    setDigits((prev) => {
      const next = [...prev];
      incoming.split('').forEach((d, k) => {
        next[start + k] = d;
      });
      return next;
    });
    focusBox(start + incoming.length);
  };

  const handleBoxChange = (i, event) => {
    const raw = event.target.value.replace(/\D/g, '');
    if (raw.length > 1) {
      // Autofill (one-time-code) or a typed digit over an existing one.
      const value = raw.length === 2 && digits[i] && raw.includes(digits[i])
        ? raw.replace(digits[i], '')
        : raw;
      fillFrom(i, value);
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[i] = raw;
      return next;
    });
    if (raw) focusBox(i + 1);
  };

  const handleBoxKeyDown = (i, event) => {
    if (event.key === 'Backspace' && !digits[i] && i > 0) {
      event.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        next[i - 1] = '';
        return next;
      });
      focusBox(i - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(i - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(i + 1);
    }
  };

  const handleBoxPaste = (i, event) => {
    event.preventDefault();
    fillFrom(i, event.clipboardData.getData('text'));
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await resendOtp({ email, purpose });
      toast.success(
        apiMessage(res, 'A new code has been sent to your email.')
      );
      resetCode();
      setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (apiStatus(err) === HTTP.TOO_MANY_REQUESTS) {
        // Server-side cooldown still open - resync the local countdown with it.
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
      icon={MailCheck}
      centered
      title={title}
      description={
        <>
          We sent a {OTP_LENGTH}-digit code to <strong>{email}</strong>
        </>
      }
      footer={
        <Link to="/login" className="au-back">
          <ArrowLeft aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="au-otp" role="group" aria-label="Verification code">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                boxRefs.current[i] = el;
              }}
              className={`au-otp-box${digit ? ' filled' : ''}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={i === 0 ? OTP_LENGTH : 2}
              value={digit}
              autoFocus={i === 0}
              disabled={submitting}
              aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
              onChange={(e) => handleBoxChange(i, e)}
              onKeyDown={(e) => handleBoxKeyDown(i, e)}
              onPaste={(e) => handleBoxPaste(i, e)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        <label className="checkbox-row au-remember" htmlFor="rememberMe">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={submitting}
          />
          Remember this device for 30 days
        </label>

        <button
          type="submit"
          className="btn btn-primary btn-lg au-submit"
          disabled={code.length !== OTP_LENGTH || submitting}
        >
          {submitting && <Loader2 className="spin" aria-hidden="true" />}
          {submitting ? 'Verifying…' : 'Verify'}
        </button>

        <p className="au-resend">
          Didn&apos;t get it?{' '}
          <button
            type="button"
            className="au-resend-btn"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
          >
            {resending
              ? 'Sending…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
