import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import AuthVisual from '@/components/AuthVisual';
import Brand from '@/components/mockui/Brand';
import '@/styles/auth.css';

/**
 * Split layout shared by every auth screen (sign in / sign up / OTP / failure):
 * indigo story panel on the left (hidden < 900px), a centred white form card on
 * the right. Presentational only - pages own all state and behaviour.
 *
 * `icon` renders a soft status chip above the title (OTP mail chip, failure X);
 * `iconTone="danger"` turns it into the red circle. `centered` centres the card
 * content for the single-purpose screens.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
  icon: Icon,
  iconTone,
  centered = false,
}) {
  return (
    <div className="au-page">
      <AuthVisual />

      <main className="au-main">
        <Brand className="au-mobile-brand" />
        <div className={`au-card${centered ? ' au-centered' : ''}`}>
          <header className="au-head">
            {Icon && (
              <div className={`au-status-icon${iconTone ? ` tone-${iconTone}` : ''}`} aria-hidden="true">
                <Icon />
              </div>
            )}
            <h1 className="au-title">{title}</h1>
            {description && <p className="au-sub">{description}</p>}
          </header>
          <div className="au-body">{children}</div>
          {footer && <div className="au-footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/**
 * Password input with a show/hide toggle. Spread react-hook-form's `register()`
 * result straight in - React 19 passes `ref` through as a regular prop.
 */
export function PasswordInput({ className = '', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="au-pw">
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={`input ${className}`.trim()}
      />
      <button
        type="button"
        className="au-pw-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={inputProps.id}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}
