import { FileDown, Target, Wallet } from 'lucide-react';

import Brand from '@/components/mockui/Brand';

const FEATURES = [
  [FileDown, 'Pixel-perfect PDF export', 'The same HTML drives the preview and the export'],
  [Target, 'CV match analysis', 'Keyword coverage, not gamified scores'],
  [Wallet, 'Pay locally, once', 'Buy credits with eSewa or Khalti'],
];

/**
 * The indigo story panel shared by every auth screen (sign in, sign up, OTP,
 * failure). Presentational only; `.au-visual` hides it below 900px
 * (styles/auth.css), so the form column takes the full width on phones.
 */
export default function AuthVisual() {
  return (
    <aside className="au-visual" aria-label="About CVGen">
      <div className="au-visual-content">
        <Brand onDark />
        <h2>
          Your CV should get you the interview.
          <br />
          Not rejected by a parser.
        </h2>
        <p className="au-visual-lead">
          Most CVs are filtered out before a human ever reads them. CVGen helps
          you build machine-readable, keyword-aware resumes with transparent
          analysis, so you know exactly where you stand.
        </p>

        <ul className="au-features">
          {FEATURES.map(([Icon, title, desc]) => (
            <li key={title} className="au-feature">
              <span className="au-feature-icon">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <div className="au-feature-title">{title}</div>
                <div className="au-feature-desc">{desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="au-visual-footer">© 2026 CVGen · Texas International College</div>
    </aside>
  );
}
