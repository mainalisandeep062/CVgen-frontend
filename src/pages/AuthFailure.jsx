import { useSearchParams, Link } from 'react-router-dom';
import { X } from 'lucide-react';

import AuthShell from '@/components/AuthShell';

/** decodeURIComponent that never throws on a stray `%` in the query string. */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * AuthFailure page - shown when the OAuth flow itself fails. The backend's
 * OAuth2AuthenticationFailureHandler redirects here with ?error=<message-or-code>.
 */
export default function AuthFailure() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'Unknown error';

  return (
    <AuthShell
      icon={X}
      iconTone="danger"
      centered
      title="Sign in failed"
      description="We couldn't complete sign-in with your provider."
    >
      <p className="au-error-msg" role="alert">
        {safeDecode(error)}
      </p>
      <Link to="/login" className="btn btn-primary btn-lg au-submit">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
