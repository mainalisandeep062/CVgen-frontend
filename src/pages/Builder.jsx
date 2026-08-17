import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import TopNav from '@/components/mockui/TopNav';
import Modal from '@/components/mockui/Modal';
import { showToast } from '@/components/mockui/toast';
import { createCV, getCV, updateCV, cvToPlainText } from '@/mock/cvStore';

/**
 * Builder — the CV editor from the mock template, converted to React with
 * REAL client-side state: every field is controlled, edits update the live
 * preview instantly, and changes autosave (debounced) to the mock cvStore.
 *
 * Mocked backend features (documented in src/mock/*.js):
 *   - CV persistence          -> localStorage via cvStore  (PUT /api/cvs/{id})
 *   - Import PDF/DOCX parse   -> simulated pipeline        (POST /api/import)
 *   - GitHub repo import      -> toast only                (GET /api/import/github)
 *   - PDF export job          -> simulated job + download  (POST /api/cvs/{id}/export)
 *   - AI enhance (✨)          -> toast only                (POST /api/ai/enhance)
 *
 * The ATS View and Raw view are NOT canned markup — both are derived from the
 * live CV state, so they change as the user types.
 */

const uid = () => `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function formatMonth(value) {
  if (!value) return '';
  const [y, m] = value.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1] || m} ${y}`;
}

/* ---------- Section wrapper (collapsible card) ---------- */
function Section({ num, title, status, complete, open, onToggle, children }) {
  return (
    <div className="section-card">
      <div className="section-header" onClick={onToggle}>
        <div className="section-header-left">
          <span className="section-num">{num}</span>
          <span className="section-header-title">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="section-status">
            <span className={`status-dot${complete ? '' : ' empty'}`} />
            {status}
          </span>
          <svg className={`chevron${open ? ' rotated' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      <div className={`section-body${open ? '' : ' collapsed'}`}>{children}</div>
    </div>
  );
}

/* ---------- Live preview document ---------- */
function PreviewDoc({ cv }) {
  const p = cv.personal;
  return (
    <div className="doc-frame">
      <div className="doc-header">
        <div className="doc-name">{p.fullName || 'Your Name'}</div>
        <div className="doc-role">{p.title || 'Professional Title'}</div>
        <div className="doc-contact">
          {[p.email, p.phone, p.location, p.linkedin, p.website]
            .filter(Boolean)
            .map((c, i, arr) => (
              <span key={i}>
                {c}
                {i < arr.length - 1 ? ' • ' : ''}
              </span>
            ))}
        </div>
      </div>
      {cv.summary && (
        <div className="doc-section">
          <div className="doc-section-title">Professional Summary</div>
          <div className="doc-entry-desc">{cv.summary}</div>
        </div>
      )}
      {cv.experience.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Experience</div>
          {cv.experience.map((e) => (
            <div className="doc-entry" key={e.id}>
              <div className="doc-entry-header">
                <span className="doc-entry-title">
                  {e.role || 'Role'} — {e.company || 'Company'}
                </span>
                <span className="doc-entry-date">
                  {formatMonth(e.start)} – {e.current ? 'Present' : formatMonth(e.end)}
                </span>
              </div>
              <div className="doc-entry-desc">{e.description}</div>
            </div>
          ))}
        </div>
      )}
      {cv.education.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Education</div>
          {cv.education.map((e) => (
            <div className="doc-entry" key={e.id}>
              <div className="doc-entry-header">
                <span className="doc-entry-title">
                  {e.degree || 'Degree'} — {e.institution || 'Institution'}
                </span>
                <span className="doc-entry-date">
                  {e.startYear} – {e.endYear}
                </span>
              </div>
              <div className="doc-entry-desc">{e.achievements}</div>
            </div>
          ))}
        </div>
      )}
      {cv.skills.technical.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Skills</div>
          <div className="doc-skills">
            {cv.skills.technical.map((s, i) => (
              <span className="doc-skill" key={i}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {cv.projects.length > 0 && (
        <div className="doc-section">
          <div className="doc-section-title">Projects</div>
          {cv.projects.map((pr) => (
            <div className="doc-entry" key={pr.id}>
              <div className="doc-entry-header">
                <span className="doc-entry-title">{pr.name || 'Project'}</span>
              </div>
              <div className="doc-entry-desc">{pr.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- ATS view, derived from live CV state ---------- */
function AtsView({ cv }) {
  const p = cv.personal;
  const contactFields = [p.fullName, p.email, p.phone, p.location].filter(Boolean).length;
  const hasSkills = cv.skills.technical.length > 0;
  return (
    <div className="ats-view">
      <div className="ats-section">
        <div className="ats-section-title">Personal Information</div>
        <div className="ats-field"><span className="ats-field-label">Name</span><span className="ats-field-value">{p.fullName || '—'}</span></div>
        <div className="ats-field"><span className="ats-field-label">Email</span><span className="ats-field-value">{p.email || '—'}</span></div>
        <div className="ats-field"><span className="ats-field-label">Phone</span><span className="ats-field-value">{p.phone || '—'}</span></div>
        <div className="ats-field"><span className="ats-field-label">Location</span><span className="ats-field-value">{p.location || '—'}</span></div>
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
            <div className="ats-field">
              <span className="ats-field-label">Entry {i + 1}</span>
              <span className="ats-field-value">{e.role || '—'} at {e.company || '—'}</span>
            </div>
            <div className="ats-field">
              <span className="ats-field-label">Dates</span>
              <span className="ats-field-value">{formatMonth(e.start) || '—'} – {e.current ? 'Present' : formatMonth(e.end) || '—'}</span>
            </div>
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
        <div className="ats-field">
          <span className="ats-field-label">Detected</span>
          <span className="ats-field-value">
            {hasSkills ? cv.skills.technical.join(', ') : '—'}
          </span>
        </div>
        {!hasSkills && (
          <div className="ats-warn mt-2">⚠ Skills section not explicitly labeled — inferred from summary and experience</div>
        )}
      </div>
      <div className="ats-section">
        <div className="ats-section-title">Structural Warnings</div>
        <div className="ats-check">✓ Single-column layout — highly ATS-compatible</div>
        <div className="ats-check">✓ No tables or images detected</div>
        {!hasSkills && <div className="ats-warn">⚠ No explicit skills section header found</div>}
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function Builder() {
  const { id } = useParams();

  // Load existing CV or create a blank one on first mount.
  const [cv, setCV] = useState(() => {
    if (id) {
      const existing = getCV(id);
      if (existing) return existing;
    }
    const created = createCV({ title: 'Untitled CV' });
    // Replace the URL so a refresh edits the same CV instead of making another.
    window.history.replaceState(null, '', `/builder/${created.id}`);
    return created;
  });

  const [openSections, setOpenSections] = useState({ experience: true });
  const [previewTab, setPreviewTab] = useState('preview');
  const [zoom, setZoom] = useState(1);
  const [mobileTab, setMobileTab] = useState('form');
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importSteps, setImportSteps] = useState(null); // null | index of active step
  const [importDone, setImportDone] = useState(false);
  const [exportState, setExportState] = useState('pending'); // pending | processing | complete
  const [savedAt, setSavedAt] = useState(Date.now());
  const saveTimer = useRef(null);

  // Debounced autosave to the mock store.
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateCV(cv.id, cv);
      setSavedAt(Date.now());
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [cv]);

  const patch = (updates) => setCV((prev) => ({ ...prev, ...updates }));
  const patchPersonal = (k, v) => patch({ personal: { ...cv.personal, [k]: v } });
  const patchSkills = (k, v) => patch({ skills: { ...cv.skills, [k]: v } });

  const patchItem = (list, itemId, k, v) =>
    patch({ [list]: cv[list].map((it) => (it.id === itemId ? { ...it, [k]: v } : it)) });
  const addItem = (list, blank) => patch({ [list]: [...cv[list], { ...blank, id: uid() }] });
  const removeItem = (list, itemId) =>
    patch({ [list]: cv[list].filter((it) => it.id !== itemId) });

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const sectionComplete = {
    personal: Boolean(cv.personal.fullName && cv.personal.email),
    summary: Boolean(cv.summary.trim()),
    experience: cv.experience.length > 0,
    education: cv.education.length > 0,
    skills: cv.skills.technical.length > 0,
    projects: cv.projects.length > 0,
  };

  const skillsText = useMemo(() => cv.skills.technical.join(', '), [cv.skills.technical]);

  /* --- Import simulation (mock of POST /api/import) --- */
  const IMPORT_STEPS = ['Upload received', 'Reading document', 'Extracting sections', 'Building editable CV'];
  const simulateImport = () => {
    setImportDone(false);
    setImportSteps(0);
    IMPORT_STEPS.forEach((_, i) => {
      setTimeout(() => {
        if (i === IMPORT_STEPS.length - 1) {
          setImportSteps(IMPORT_STEPS.length);
          setImportDone(true);
          showToast('Import complete! Review the pre-filled data below.');
        } else {
          setImportSteps(i + 1);
        }
      }, (i + 1) * 1200);
    });
  };
  const applyImport = () => {
    // MOCK: pretend the parser extracted the seed profile.
    patch({
      personal: {
        fullName: 'Sandeep Mainali',
        title: 'Full Stack Developer',
        email: 'sandeep@example.com',
        phone: '+977 98XXXXXXXX',
        location: 'Kathmandu, Nepal',
        linkedin: 'linkedin.com/in/sandeep',
        website: 'github.com/mainalisandeep062',
      },
    });
    setImportOpen(false);
    setImportSteps(null);
    showToast('CV imported successfully');
  };

  /* --- Export simulation (mock of POST /api/cvs/{id}/export) --- */
  const fileName = `${(cv.personal.fullName || 'CV').replace(/\s+/g, '_')}_CV.pdf`;
  const simulateExport = () => {
    setExportState('processing');
    setTimeout(() => setExportState('complete'), 2500);
  };
  const downloadExport = () => {
    // MOCK: the real export is a server-rendered PDF. Offline we hand the user
    // the exact text the PDF would carry, so the flow is still demonstrable.
    const blob = new Blob([cvToPlainText(cv)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName.replace(/\.pdf$/, '.txt');
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Download started');
  };

  const sidebarLink = (key, label, icon, done) => (
    <a
      className="sidebar-link"
      href={`#${key}`}
      onClick={() => setOpenSections((prev) => ({ ...prev, [key]: true }))}
    >
      {icon}
      <span>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.625rem', color: done ? 'var(--success)' : 'var(--fg-subtle)', opacity: done ? 1 : 0.4 }}>
        {done ? '✓' : '○'}
      </span>
    </a>
  );

  const icon = (path) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{path}</svg>
  );

  return (
    <>
      <TopNav />

      <div className="mobile-tabs" style={{ position: 'sticky', top: '56px', zIndex: 40, background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex' }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, borderRadius: 0, borderBottom: `2px solid ${mobileTab === 'form' ? 'var(--primary)' : 'transparent'}`, fontSize: '0.8125rem' }}
          onClick={() => setMobileTab('form')}
        >
          Edit
        </button>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, borderRadius: 0, borderBottom: `2px solid ${mobileTab === 'preview' ? 'var(--primary)' : 'transparent'}`, fontSize: '0.8125rem' }}
          onClick={() => setMobileTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className="builder-layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">CV Content</div>
            {sidebarLink('personal', 'Personal Info', icon(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>), sectionComplete.personal)}
            {sidebarLink('summary', 'Summary', icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>), sectionComplete.summary)}
            {sidebarLink('experience', 'Experience', icon(<><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>), sectionComplete.experience)}
            {sidebarLink('education', 'Education', icon(<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" /></>), sectionComplete.education)}
            {sidebarLink('skills', 'Skills', icon(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />), sectionComplete.skills)}
            {sidebarLink('projects', 'Projects', icon(<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>), sectionComplete.projects)}
          </div>
          <div className="sidebar-section" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="sidebar-title">Actions</div>
            <a className="sidebar-link" href="#" onClick={(e) => { e.preventDefault(); setImportOpen(true); }}>
              {icon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>)}
              Import CV
            </a>
            <Link className="sidebar-link" to="/scoring">
              {icon(<><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></>)}
              CV Match Analysis
            </Link>
            <a className="sidebar-link" href="#" onClick={(e) => { e.preventDefault(); setExportState('pending'); setExportOpen(true); }}>
              {icon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>)}
              Export PDF
            </a>
          </div>
        </aside>

        <div className="builder-main">
          <div className="form-panel" style={mobileTab === 'preview' ? { display: 'none' } : undefined}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <input
                  className="input"
                  style={{ fontSize: '1.125rem', fontWeight: 700, border: 'none', padding: 0, boxShadow: 'none', background: 'transparent' }}
                  value={cv.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  aria-label="CV title"
                />
                <p className="text-sm text-muted mt-1">
                  <span style={{ color: 'var(--success)' }}>✓</span> Saved{' '}
                  {Math.max(0, Math.round((Date.now() - savedAt) / 1000))}s ago · Template: {cv.template}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setImportOpen(true)}>Import</button>
                <button className="btn btn-primary btn-sm" onClick={() => { setExportState('pending'); setExportOpen(true); }}>Export PDF</button>
              </div>
            </div>

            <div id="personal">
              <Section num="01" title="Personal Information" status={sectionComplete.personal ? 'Complete' : 'Incomplete'} complete={sectionComplete.personal} open={Boolean(openSections.personal)} onToggle={() => toggleSection('personal')}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label className="label">Full Name</label><input type="text" className="input" value={cv.personal.fullName} onChange={(e) => patchPersonal('fullName', e.target.value)} /></div>
                  <div className="form-group"><label className="label">Professional Title</label><input type="text" className="input" value={cv.personal.title} onChange={(e) => patchPersonal('title', e.target.value)} /></div>
                  <div className="form-group"><label className="label">Email</label><input type="email" className="input" value={cv.personal.email} onChange={(e) => patchPersonal('email', e.target.value)} /></div>
                  <div className="form-group"><label className="label">Phone</label><input type="tel" className="input" value={cv.personal.phone} onChange={(e) => patchPersonal('phone', e.target.value)} /></div>
                  <div className="form-group"><label className="label">Location</label><input type="text" className="input" value={cv.personal.location} onChange={(e) => patchPersonal('location', e.target.value)} /></div>
                  <div className="form-group"><label className="label">LinkedIn</label><input type="url" className="input" value={cv.personal.linkedin} onChange={(e) => patchPersonal('linkedin', e.target.value)} /></div>
                </div>
                <div className="form-group mt-2" style={{ marginBottom: 0 }}>
                  <label className="label">Website / Portfolio</label>
                  <input type="url" className="input" value={cv.personal.website} onChange={(e) => patchPersonal('website', e.target.value)} />
                </div>
              </Section>
            </div>

            <div id="summary">
              <Section num="02" title="Professional Summary" status={sectionComplete.summary ? 'Complete' : 'Empty'} complete={sectionComplete.summary} open={Boolean(openSections.summary)} onToggle={() => toggleSection('summary')}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <textarea className="textarea" rows="4" value={cv.summary} onChange={(e) => patch({ summary: e.target.value })} />
                </div>
                <div className="flex gap-1 mt-2">
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => showToast('Rich text editing is a planned feature')}><b>B</b></button>
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => showToast('Rich text editing is a planned feature')}><i>I</i></button>
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => showToast('Rich text editing is a planned feature')}>🔗</button>
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={() => showToast('Rich text editing is a planned feature')}>• List</button>
                </div>
              </Section>
            </div>

            <div id="experience">
              <Section num="03" title="Work Experience" status={cv.experience.length ? `${cv.experience.length} ${cv.experience.length === 1 ? 'entry' : 'entries'}` : 'Empty'} complete={sectionComplete.experience} open={Boolean(openSections.experience)} onToggle={() => toggleSection('experience')}>
                {cv.experience.map((e) => (
                  <div className="array-item" key={e.id}>
                    <div className="array-item-header">
                      <span className="array-item-title">{e.role || 'New role'}</span>
                      <div className="array-item-actions">
                        <button className="icon-btn" title="Delete" onClick={() => removeItem('experience', e.id)}>✕</button>
                      </div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Company</label><input type="text" className="input" value={e.company} onChange={(ev) => patchItem('experience', e.id, 'company', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Role</label><input type="text" className="input" value={e.role} onChange={(ev) => patchItem('experience', e.id, 'role', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Start Date</label><input type="month" className="input" value={e.start} onChange={(ev) => patchItem('experience', e.id, 'start', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>End Date</label><input type="month" className="input" value={e.end} disabled={e.current} onChange={(ev) => patchItem('experience', e.id, 'end', ev.target.value)} /></div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--fg-subtle)', margin: '0.25rem 0 0.5rem' }}>
                      <input type="checkbox" checked={e.current} onChange={(ev) => patchItem('experience', e.id, 'current', ev.target.checked)} />
                      I currently work here
                    </label>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="label" style={{ fontSize: '0.75rem' }}>Description</label><textarea className="textarea" rows="3" value={e.description} onChange={(ev) => patchItem('experience', e.id, 'description', ev.target.value)} /></div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addItem('experience', { company: '', role: '', start: '', end: '', current: false, description: '' })}>+ Add Experience</button>
              </Section>
            </div>

            <div id="education">
              <Section num="04" title="Education" status={cv.education.length ? `${cv.education.length} ${cv.education.length === 1 ? 'entry' : 'entries'}` : 'Empty'} complete={sectionComplete.education} open={Boolean(openSections.education)} onToggle={() => toggleSection('education')}>
                {cv.education.map((e) => (
                  <div className="array-item" key={e.id}>
                    <div className="array-item-header">
                      <span className="array-item-title">{e.degree || 'New degree'}</span>
                      <div className="array-item-actions">
                        <button className="icon-btn" title="Delete" onClick={() => removeItem('education', e.id)}>✕</button>
                      </div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Institution</label><input type="text" className="input" value={e.institution} onChange={(ev) => patchItem('education', e.id, 'institution', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Degree</label><input type="text" className="input" value={e.degree} onChange={(ev) => patchItem('education', e.id, 'degree', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Start Year</label><input type="number" className="input" value={e.startYear} onChange={(ev) => patchItem('education', e.id, 'startYear', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>End Year</label><input type="number" className="input" value={e.endYear} onChange={(ev) => patchItem('education', e.id, 'endYear', ev.target.value)} /></div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="label" style={{ fontSize: '0.75rem' }}>Achievements</label><textarea className="textarea" rows="2" value={e.achievements} onChange={(ev) => patchItem('education', e.id, 'achievements', ev.target.value)} /></div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addItem('education', { institution: '', degree: '', startYear: '', endYear: '', achievements: '' })}>+ Add Education</button>
              </Section>
            </div>

            <div id="skills">
              <Section num="05" title="Skills" status={sectionComplete.skills ? 'Complete' : 'Empty'} complete={sectionComplete.skills} open={Boolean(openSections.skills)} onToggle={() => toggleSection('skills')}>
                <div className="form-group">
                  <label className="label">Technical Skills (comma separated)</label>
                  <textarea
                    className="textarea"
                    rows="3"
                    placeholder="Java, React, PostgreSQL, Spring Boot..."
                    value={skillsText}
                    onChange={(e) =>
                      patchSkills('technical', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="label">Soft Skills</label>
                  <textarea
                    className="textarea"
                    rows="2"
                    placeholder="Leadership, Communication..."
                    value={cv.skills.soft.join(', ')}
                    onChange={(e) =>
                      patchSkills('soft', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                    }
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label">Languages</label>
                  <input type="text" className="input" placeholder="English (Fluent), Nepali (Native)..." value={cv.skills.languages} onChange={(e) => patchSkills('languages', e.target.value)} />
                </div>
              </Section>
            </div>

            <div id="projects">
              <Section num="06" title="Projects" status={cv.projects.length ? `${cv.projects.length} ${cv.projects.length === 1 ? 'entry' : 'entries'}` : 'Empty'} complete={sectionComplete.projects} open={Boolean(openSections.projects)} onToggle={() => toggleSection('projects')}>
                {cv.projects.map((pr) => (
                  <div className="array-item" key={pr.id}>
                    <div className="array-item-header">
                      <span className="array-item-title">{pr.name || 'New project'}</span>
                      <div className="array-item-actions">
                        <button className="icon-btn" title="AI Enhance (planned)" onClick={() => showToast('AI enhancement is a planned backend feature')}>✨</button>
                        <button className="icon-btn" title="Delete" onClick={() => removeItem('projects', pr.id)}>✕</button>
                      </div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Project Name</label><input type="text" className="input" value={pr.name} onChange={(ev) => patchItem('projects', pr.id, 'name', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Link</label><input type="url" className="input" value={pr.link} onChange={(ev) => patchItem('projects', pr.id, 'link', ev.target.value)} /></div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="label" style={{ fontSize: '0.75rem' }}>Description</label><textarea className="textarea" rows="3" value={pr.description} onChange={(ev) => patchItem('projects', pr.id, 'description', ev.target.value)} /></div>
                  </div>
                ))}
                <button className="add-item-btn" onClick={() => addItem('projects', { name: '', link: '', description: '' })}>+ Add Project</button>
              </Section>
            </div>

            <div style={{ height: '4rem' }} />
          </div>

          <div className="preview-panel" style={mobileTab === 'form' ? undefined : { display: 'block', position: 'relative', top: 0, height: 'auto', minHeight: 'calc(100vh - 56px)' }}>
            <div className="preview-toolbar">
              <div className="preview-actions">
                <button className={`preview-tab${previewTab === 'preview' ? ' active' : ''}`} onClick={() => setPreviewTab('preview')}>Preview</button>
                <button className={`preview-tab${previewTab === 'ats' ? ' active' : ''}`} onClick={() => setPreviewTab('ats')}>ATS View</button>
                <button className={`preview-tab${previewTab === 'raw' ? ' active' : ''}`} onClick={() => setPreviewTab('raw')}>Raw</button>
              </div>
              <div className="zoom-controls">
                {[0.75, 1, 1.25].map((z) => (
                  <button key={z} className={`zoom-btn${zoom === z ? ' active' : ''}`} onClick={() => setZoom(z)}>
                    {Math.round(z * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {previewTab === 'preview' && <PreviewDoc cv={cv} />}
              {previewTab === 'ats' && <AtsView cv={cv} />}
              {previewTab === 'raw' && (
                <div className="ats-view">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div className="ats-section-title" style={{ marginBottom: 0 }}>Extracted Raw Text</div>
                    <span className="text-xs text-muted">What the parser sees</span>
                  </div>
                  <div className="ats-raw">{cvToPlainText(cv)}</div>
                </div>
              )}
            </div>

            <button className="btn btn-primary w-full mt-4" onClick={() => { setExportState('pending'); setExportOpen(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Import modal — simulated parse pipeline */}
      <Modal
        open={importOpen}
        onClose={() => { setImportOpen(false); setImportSteps(null); setImportDone(false); }}
        title="Import Existing CV"
        large
        footer={<button className="btn btn-ghost" onClick={() => { setImportOpen(false); setImportSteps(null); setImportDone(false); }}>Cancel</button>}
      >
        {importSteps === null && (
          <div
            style={{ border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', cursor: 'pointer', color: 'var(--fg-subtle)' }}
            onClick={simulateImport}
          >
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </div>
            <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>Click to upload or drag and drop</div>
            <div className="text-xs text-muted mt-1">PDF or DOCX, max 5MB (simulated)</div>
          </div>
        )}
        {importSteps !== null && (
          <>
            <div className="import-steps">
              {IMPORT_STEPS.map((label, i) => {
                const state = i < importSteps ? 'done' : i === importSteps ? 'active' : 'pending';
                return (
                  <div className={`import-step ${state}`} key={label}>
                    <div className="import-step-icon">
                      {state === 'done' ? '✓' : state === 'active' ? <span className="skeleton" style={{ width: '14px', height: '14px', borderRadius: '50%' }} /> : '○'}
                    </div>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
            {importDone && (
              <>
                <div className="divider" />
                <div className="font-medium text-sm mb-2">Review Extracted Data</div>
                <div className="p-3 bg-muted rounded-md text-sm text-muted">
                  Name: <b>Sandeep Mainali</b><br />Email: <b>sandeep@example.com</b><br />Experience: <b>2 entries detected</b>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn btn-primary btn-sm" onClick={applyImport}>Import &amp; Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setImportSteps(null); setImportDone(false); }}>Start Over</button>
                </div>
              </>
            )}
          </>
        )}
        <div className="divider" />
        <div className="font-medium text-sm mb-2">Or import from GitHub</div>
        <div className="flex gap-2">
          <input type="text" className="input" placeholder="github.com/username" defaultValue="github.com/mainalisandeep062" />
          <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }} onClick={() => showToast('Fetching repositories... (backend endpoint pending)')}>Fetch Repos</button>
        </div>
      </Modal>

      {/* Export modal — simulated server job */}
      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export CV to PDF"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setExportOpen(false)}>Cancel</button>
            {exportState === 'pending' && (
              <button className="btn btn-primary" onClick={simulateExport}>Confirm Export</button>
            )}
          </>
        }
      >
        <div className={`job-state ${exportState}`}>
          <div className="job-state-icon">
            {exportState === 'pending' ? '○' : exportState === 'processing' ? '⟳' : '✓'}
          </div>
          <div>
            <div className="font-medium text-sm">
              {exportState === 'pending' ? 'Ready to export' : exportState === 'processing' ? 'Processing your PDF' : 'Export complete'}
            </div>
            <div className="text-xs" style={{ opacity: 0.7 }}>
              {exportState === 'pending'
                ? 'Your CV will be rendered server-side as a pixel-perfect PDF'
                : exportState === 'processing'
                  ? 'Rendering HTML → Converting to PDF (simulated)'
                  : `${fileName} is ready`}
            </div>
          </div>
        </div>
        <div className="p-4 bg-muted rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-sm">Template</span>
            <span className="text-sm text-muted">{cv.template} ({cv.templateTier === 'premium' ? 'Premium' : 'Free'})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">File Name</span>
            <span className="text-sm text-muted">{fileName}</span>
          </div>
        </div>
        {exportState === 'complete' && (
          <button className="btn btn-primary w-full" onClick={downloadExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download PDF
          </button>
        )}
      </Modal>
    </>
  );
}
