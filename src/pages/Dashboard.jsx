import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, FileText, Loader2, LogOut, ShieldAlert } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { fetchCurrentUser } from '@/api/user';
import { Button } from '@/components/ui/button';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Dashboard — the authenticated shell.
 *
 * Two sources of identity, deliberately kept distinct:
 *
 *  - The JWT claims from AuthContext (sub, iss, id, provider, name, email,
 *    imageUrl, authorities). Available instantly, but a snapshot from the
 *    moment the token was issued.
 *  - GET /api/users/me (UserResponseDto), fetched here. This is server truth
 *    and carries what the token does not: the email-verified flag, every linked
 *    OAuth identity, and the account creation date. It is fetched once on mount
 *    and only ever supplements the claims — if the request fails, the page
 *    still renders from the token rather than blocking or blanking.
 *
 * The "Your CVs" section is an HONEST empty state: the backend has no
 * CV/resume entity, controller, or storage endpoint of any kind, so there is
 * nothing to create, list, or export yet. The control is disabled rather than
 * mocked — no placeholder data pretends the feature exists.
 */

function initials(name) {
  if (!name) return 'U';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';
}

/** `createdAt` arrives as an ISO-8601 local date-time string. */
function formatDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        // Non-fatal: the token claims below still render the page. A 401 here is
        // already handled globally by the axios refresh interceptor.
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const name = profile?.name || user?.name || 'User';
  const email = profile?.email || user?.email || '';
  const providers = profile?.providers ?? [];

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">CVgen</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
                <Avatar className="h-8 w-8">
                  {user?.imageUrl && (
                    <AvatarImage src={user.imageUrl} alt="" />
                  )}
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-medium">{name}</span>
                {email && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {email}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome{name !== 'User' ? `, ${name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in to CVgen.
          </p>
        </div>

        {/* Honest CV empty state — the backend has no CV feature yet. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your CVs</CardTitle>
            <CardDescription>
              Create, manage, and export your resumes here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No CVs yet</p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  CV creation isn&apos;t available yet — the backend doesn&apos;t
                  expose any resume feature at this time. This section will light
                  up once it does.
                </p>
              </div>
              <Button disabled>Create CV (coming soon)</Button>
            </div>
          </CardContent>
        </Card>

        {/* Server-side profile — GET /api/users/me. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>
              Read from your account on the server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your profile…
              </div>
            )}

            {!profileLoading && !profile && (
              <p className="text-sm text-muted-foreground">
                Your profile couldn&apos;t be loaded right now. The account
                details below still come from your signed session token.
              </p>
            )}

            {!profileLoading && profile && (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <Detail label="Name" value={profile.name} />
                <Detail label="Email" value={profile.email} />
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Email status
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm">
                    {profile.isEmailVerified ? (
                      <>
                        <BadgeCheck className="h-4 w-4 text-primary" />
                        Verified
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                        Not verified
                      </>
                    )}
                  </dd>
                </div>
                <Detail
                  label="Member since"
                  value={formatDate(profile.createdAt)}
                />
                <Detail
                  label="Linked sign-in methods"
                  value={
                    providers.length > 0
                      ? providers.join(', ')
                      : 'Email and password only'
                  }
                  className="capitalize"
                />
                <Detail label="User ID" value={profile.userId} mono />
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Session details — verified JWT claims only. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session</CardTitle>
            <CardDescription>
              Read from your signed session token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Detail
                label="Signed in with"
                value={user?.provider}
                className="capitalize"
              />
              <Detail
                label="Authorities"
                value={user?.authorities?.join(', ')}
              />
              <Detail label="Issued by" value={user?.iss} />
              <Detail label="Subject" value={user?.sub} mono />
            </dl>
            <Separator className="my-4" />
            <Detail label="User ID (claim)" value={user?.id} mono />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Detail({ label, value, mono = false, className = '' }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 break-all text-sm ${mono ? 'font-mono' : ''} ${className}`}
      >
        {value || '—'}
      </dd>
    </div>
  );
}
