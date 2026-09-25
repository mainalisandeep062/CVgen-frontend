import { Link } from 'react-router-dom';
import { BarChart3, Check, Download, Upload } from 'lucide-react';

const BUILDER_SECTIONS = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'summary', label: 'Summary' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
];

/** Projects are the one section a CV reads fine without. */
const OPTIONAL = new Set(['projects']);

const STATUS_TEXT = { done: 'Done', partial: 'In progress', empty: 'To do' };

function StatusIcon({ status }) {
  if (status === 'done') {
    return (
      <span className="bs-check is-done" aria-hidden="true">
        <Check strokeWidth={3} />
      </span>
    );
  }
  return <span className={`bs-check ${status === 'partial' ? 'is-partial' : 'is-empty'}`} aria-hidden="true" />;
}

function HealthRing({ score }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const tone = score >= 60 ? 'good' : score >= 35 ? 'fair' : 'low';
  const label = { good: 'Parser-friendly', fair: 'Getting there', low: 'Needs work' }[tone];
  return (
    <div className="bs-health">
      <div className={`bs-ring tone-${tone}`}>
        <svg viewBox="0 0 42 42" width="42" height="42" aria-hidden="true">
          <circle cx="21" cy="21" r={r} className="bs-ring-track" />
          <circle
            cx="21"
            cy="21"
            r={r}
            className="bs-ring-fill"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            transform="rotate(-90 21 21)"
          />
        </svg>
        <span className="bs-ring-value">{score}%</span>
      </div>
      <div className="min-w-0">
        <div className="bs-health-title">ATS Health Score</div>
        <div className={`bs-health-label tone-${tone}`}>
          <span className="bs-health-dot" aria-hidden="true" />
          {label}
        </div>
      </div>
    </div>
  );
}

/** Left column: section nav with progress, the ATS health card, and actions. */
export default function BuilderSidebar({ cvId, status, health, active, onJump, onImport, onExport }) {
  const done = BUILDER_SECTIONS.filter((s) => status[s.key] === 'done').length;
  return (
    <aside className="bs-sidebar" aria-label="CV sections">
      <div className="bs-group">
        <div className="bs-group-head">
          <span className="bs-group-title">CV Content</span>
          <span className="bs-count">
            {done}/{BUILDER_SECTIONS.length}
          </span>
        </div>
        <nav className="bs-nav">
          {BUILDER_SECTIONS.map(({ key, label }) => {
            const s = status[key];
            const text = s === 'empty' && OPTIONAL.has(key) ? 'Optional' : STATUS_TEXT[s];
            return (
              <a
                key={key}
                className={`bs-link${active === key ? ' is-active' : ''}`}
                href={`#${key}`}
                aria-current={active === key ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onJump(key);
                }}
              >
                <StatusIcon status={s} />
                <span className="bs-link-label">{label}</span>
                <span className={`bs-link-status is-${s}`}>{text}</span>
              </a>
            );
          })}
        </nav>
        <HealthRing score={health} />
      </div>

      <div className="bs-group bs-actions">
        <div className="bs-group-title">Actions</div>
        <button type="button" className="bs-action" onClick={onImport}>
          <Upload aria-hidden="true" />
          Import CV
        </button>
        <Link className="bs-action" to={`/scoring?cv=${encodeURIComponent(cvId)}`}>
          <BarChart3 aria-hidden="true" />
          Match Analysis
          <span className="bs-new">New</span>
        </Link>
        <button type="button" className="bs-action" onClick={onExport}>
          <Download aria-hidden="true" />
          Export PDF
        </button>
      </div>
    </aside>
  );
}
