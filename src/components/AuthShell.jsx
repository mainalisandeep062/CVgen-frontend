import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * Centered card layout shared by the auth screens (login / signup / OTP /
 * failure). Presentational only.
 */
export default function AuthShell({ title, description, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl">{title}</CardTitle>
          {description && (
            <CardDescription className="text-center">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
        {footer && (
          <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
