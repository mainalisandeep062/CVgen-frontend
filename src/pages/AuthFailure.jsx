import { useSearchParams, Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';

/**
 * AuthFailure page — shown when the OAuth flow itself fails. The backend's
 * OAuth2AuthenticationFailureHandler redirects here with ?error=<message-or-code>.
 */
export default function AuthFailure() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'Unknown error';

  return (
    <AuthShell title="Sign in failed">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="break-words text-sm text-muted-foreground">
          {decodeURIComponent(error)}
        </p>
        <Button asChild className="w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
