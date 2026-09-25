import AuthVisual from '@/components/AuthVisual';
import Brand from '@/components/mockui/Brand';

/**
 * Layout shared by the auth screens (signup / OTP / failure). Same split as
 * the sign-in page — gradient panel on the left, form on the right — so the
 * sign-in ↔ sign-up toggle does not jump between layouts.
 *
 * Presentational only: the shadcn inputs inside pick up the palette through
 * the HSL tokens in index.css.
 */
export default function AuthShell({ title, description, children, footer }) {
  return (
    <div className="auth-page">
      <AuthVisual />

      <div className="auth-form-panel">
        <Brand className="auth-logo" />
        <h1>{title}</h1>
        {description && <p className="auth-sub">{description}</p>}
        <div className="auth-card-body">{children}</div>
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}
