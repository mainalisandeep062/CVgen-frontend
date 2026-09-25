import { useState } from 'react';
import { Download, FileText } from 'lucide-react';

import { cvToPlainText, formatMonth, wordCount } from '@/cv/content';

/**
 * Right-hand preview column: Preview | ATS View | Raw tabs, zoom chips, the
 * live document and the export button. Everything is derived from the editor
 * model, so it changes as the user types.
 */

function AtsField({ label, value }) {
  return (
    <div className="ats-field">
      <span className="ats-field-label">{label}</span>
      <span className="ats-field-value">{value || '-'}</span>
    </div>
  );
}

function AtsView({ cv }) {
  const p = cv.personal;
  const contactFields = [p.fullName, p.email, p.phone, p.location].filter(Boolean).length;
  const hasSkills = cv.skills.technical.length > 0;
  return (
    <div className="ats-view">
      <div className="ats-section">
        <div className="ats-section-title">Personal Information</div>
        <AtsField label="Name" value={p.fullName} />
        <AtsField label="Email" value={p.email} />
        <AtsField label="Phone" value={p.phone} />
        <AtsField label="Location" value={p.location} />
        {contactFields === 4 ? (
          <div className="ats-check mt-2">✓ All contact fields detected</div>
        ) : (
          <div className="ats-warn mt-2">⚠ {4 - contactFields} contact field(s) missing</div>
        )}
      </div>
      <div className="ats-section">
        <div className="ats-section-title">Experience</div>
        {cv.experience.length === 0 && <div className="ats-warn">⚠ No work experience entries</div>}
        {cv.experience.map((e, i) => (
          <div key={e.id}>
            <AtsField label={`Entry ${i + 1}`} value={`${e.role || '-'} at ${e.company || '-'}`} />
            <AtsField
              label="Dates"
              value={`${formatMonth(e.start) || '-'} – ${e.current ? 'Present' : formatMonth(e.end) || '-'}`}
            />
            <div className="ats-check mt-2">
              {e.role ? '✓ Job title detected · ' : '⚠ Missing title · '}
              {e.company ? '✓ Company detected · ' : '⚠ Missing company · '}
              {e.start ? '✓ Date range detected' : '⚠ Missing dates'}
            </div>
          </div>
        ))}
      </div>
      <div className="ats-section">
        <div className="ats-section-title">Skills</div>
        <AtsField label="Detected" value={hasSkills ? cv.skills.technical.join(', ') : ''} />
        {!hasSkills && <div className="ats-warn mt-2">⚠ No technical skills listed yet</div>}
      </div>
      <div className="ats-section">
        <div className="ats-section-title">Structural Checks</div>
        <div className="ats-check">✓ Single-column layout</div>
        <div className="ats-check">✓ No tables or images</div>
        {!hasSkills && <div className="ats-warn">⚠ No explicit skills section</div>}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'preview', label: 'Preview' },
  { key: 'ats', label: 'ATS View' },
  { key: 'raw', label: 'Raw' },
];

export default function PreviewPanel({ cv, Template, onExport, className = '' }) {
  const [tab, setTab] = useState('preview');
  const [zoom, setZoom] = useState(1);
  const words = wordCount(cv);
  // A classic single-column page holds roughly 550 words.
  const pages = Math.max(1, Math.ceil(words / 550));

  return (
    <aside className={`bp-panel ${className}`} aria-label="CV preview">
      <div className="bp-toolbar">
        <div className="bp-tabs" role="tablist" aria-label="Preview mode">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`bp-tab${tab === t.key ? ' is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="bp-zoom" role="group" aria-label="Zoom">
          {[0.75, 1, 1.25].map((z) => (
            <button
              type="button"
              key={z}
              aria-pressed={zoom === z}
              className={`bp-zoom-btn${zoom === z ? ' is-active' : ''}`}
              onClick={() => setZoom(z)}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
        </div>
      </div>

      <div className="bp-meta">
        <span className="bp-meta-info">
          <FileText aria-hidden="true" />
          {pages === 1 ? 'Page 1 of 1' : `About ${pages} pages`} · {words} words
        </span>
        <span className="bp-meta-format">A4 standard format</span>
      </div>

      <div className="bp-stage">
        <div className="bp-paper" style={{ zoom }}>
          {tab === 'preview' && <Template cv={cv} />}
          {tab === 'ats' && <AtsView cv={cv} />}
          {tab === 'raw' && (
            <div className="ats-view">
              <div className="flex justify-between items-center gap-2 mb-3">
                <div className="ats-section-title" style={{ marginBottom: 0 }}>Extracted Raw Text</div>
                <span className="text-xs text-muted">What a parser reads</span>
              </div>
              <div className="ats-raw">{cvToPlainText(cv) || 'Nothing yet. Start filling in the form.'}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bp-footer">
        <button type="button" className="bp-export" onClick={onExport}>
          <Download aria-hidden="true" />
          Export as PDF
          <kbd className="bp-kbd">Ctrl + P</kbd>
        </button>
      </div>
    </aside>
  );
}
