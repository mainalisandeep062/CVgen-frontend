import { FileDown, Target, Wallet } from 'lucide-react';

import Brand from '@/components/mockui/Brand';

/**
 * The gradient panel shared by every auth screen (sign in, sign up, OTP,
 * failure). Presentational only. `.auth-visual` hides it below 900px in
 * mockui.css, so the form panel takes the full width on phones.
 */
export default function AuthVisual() {
  return (
    <div className="auth-visual">
      <div className="auth-visual-content">
        <Brand onDark />
        <h2>
          Your CV should get you the interview.
          <br />
          Not rejected by a parser.
        </h2>
        <p>
          Most CVs are silently dropped before a human ever reads them. CVGen
          helps you build machine-readable, keyword-smart resumes with
          transparent analysis — so you know exactly where you stand.
        </p>

        <div className="auth-features">
          {[
            [FileDown, 'Pixel-perfect PDF export', 'Same HTML for preview and export'],
            [Target, 'CV Match Analysis', 'Keyword coverage, not gamified scores'],
            [Wallet, 'Local payments', 'eSewa, Khalti, ConnectIPS'],
          ].map(([Icon, title, desc]) => (
            <div key={title} className="auth-feature">
              <div className="auth-feature-icon">
                <Icon aria-hidden="true" />
              </div>
              <div>
                <div className="auth-feature-title">{title}</div>
                <div className="auth-feature-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-visual-footer">© 2026 CVGen · Texas International College</div>
    </div>
  );
}
