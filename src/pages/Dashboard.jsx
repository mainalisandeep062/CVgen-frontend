import { useNavigate } from 'react-router-dom';
import { FileText, LogOut } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
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
 * Identity is read ONLY from the verified JWT claims exposed by AuthContext
 * (sub, iss, id, provider, name, email, imageUrl, authorities). No claim
 * outside that set is displayed.
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

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const name = user?.name || 'User';
  const email = user?.email || '';

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
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
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

        {/* Account details — verified JWT claims only. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>
              Read from your signed session token.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <Detail label="Name" value={user?.name} />
              <Detail label="Email" value={user?.email} />
              <Detail
                label="Provider"
                value={user?.provider}
                className="capitalize"
              />
              <Detail
                label="Authorities"
                value={user?.authorities?.join(', ')}
              />
              <Detail label="User ID" value={user?.id} mono />
              <Detail label="Issued by" value={user?.iss} />
            </dl>
            <Separator className="my-4" />
            <Detail label="Subject" value={user?.sub} mono />
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
