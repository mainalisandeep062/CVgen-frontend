import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Bold,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Code,
  Download,
  FileText,
  GraduationCap,
  Italic,
  Link2,
  List,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react';

import TopNav from '@/components/mockui/TopNav';
import Modal from '@/components/mockui/Modal';
import { showToast } from '@/components/mockui/toast';
import {
  CV_STATUS,
  createCv,
  fetchTemplates,
  getCv,
  replaceCvContent,
  updateCvMeta,
} from '@/api/cv';
import { apiMessage, apiStatus, unwrap, HTTP } from '@/api/response';
import { cvToPlainText, formatMonth, newId, toContent, toEditorModel } from '@/cv/content';
import { templateComponent, templateName } from '@/templates/registry';

/**
 * Builder — the CV editor. Every field is controlled, edits redraw the live
 * preview instantly, and changes autosave to the backend:
 *
 *   content (all sections)   -> PUT   /api/cvs/{id}        debounced
 *   title                    -> PATCH /api/cvs/{id}/meta   debounced
 *   template / status        -> PATCH /api/cvs/{id}/meta   immediately
 *
 * `/builder` with no id creates a CV (POST /api/cvs) and replaces the URL with
 * `/builder/{id}`, so a refresh edits that CV instead of making another.
 *
 * The preview is drawn by the component registered for the CV's templateKey
 * (src/templates/registry.js); the picker lists what GET /api/templates returns.
 *
 * Still mocked here (no backend yet): Import PDF/DOCX parsing, GitHub import,
 * PDF export (downloads the plain text instead) and AI enhance.
 *
 * The ATS View and Raw view are derived from the live CV state, so they change
 * as the user types.
 */

const AUTOSAVE_DELAY_MS = 800;

/* ---------- Section wrapper (collapsible card) ---------- */
function Section({ num, title, status, complete, open, onToggle, children }) {
  return (
    <div className="section-card">
      <button type="button" className="section-header" onClick={onToggle} aria-expanded={open}>
        <span className="section-header-left">
          <span className="section-num">{num}</span>
          <span className="section-header-title">{title}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="section-status">
            <span className={`status-dot${complete ? '' : ' empty'}`} aria-hidden="true" />
            {status}
          </span>
          <ChevronDown className={`chevron${open ? ' rotated' : ''}`} aria-hidden="true" />
        </span>
      </button>
      <div className={`section-body${open ? '' : ' collapsed'}`}>{children}</div>
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
/* ---------- Load / create ---------- */
function useCvRecord(id) {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', record: null, error: null });
  // Guards the create against StrictMode's double effect run in development:
  // refs survive that re-run, so only one POST goes out.
  const creating = useRef(false);

  useEffect(() => {
    if (id) return undefined;
    if (creating.current) return undefined;
    creating.current = true;

    createCv({ title: 'Untitled CV' })
      .then((response) => navigate(`/builder/${unwrap(response).id}`, { replace: true }))
      .catch((error) =>
        setState({
          status: 'error',
          record: null,
          error: apiMessage(error, 'Could not create a new CV.'),
        })
      );
    return undefined;
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setState({ status: 'loading', record: null, error: null });

    getCv(id)
      .then((record) => {
        if (!cancelled) setState({ status: 'ready', record, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: 'error',
          record: null,
          error:
            apiStatus(error) === HTTP.NOT_FOUND
              ? 'This CV does not exist, or it is not yours.'
              : apiMessage(error, 'Could not load this CV.'),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

/* ---------- Main page ---------- */
export default function Builder() {
  const { id } = useParams();
  const { status, record, error } = useCvRecord(id);

  if (status === 'error') {
    return (
      <>
        <TopNav />
        <main className="state-panel">
          <span className="icon-chip tone-danger" aria-hidden="true"><AlertCircle /></span>
          <h1>Can&apos;t open this CV</h1>
          <p className="text-muted text-sm mb-6">{error}</p>
          <Link className="btn btn-primary" to="/dashboard">Back to your CVs</Link>
        </main>
      </>
    );
  }

  if (status !== 'ready') {
    return (
      <>
        <TopNav />
        <main className="splash" style={{ minHeight: 'calc(100vh - var(--nav-h))' }} role="status" aria-live="polite">
          <div className="splash-spinner" aria-hidden="true" />
          <p className="splash-text">{id ? 'Loading CV…' : 'Creating a new CV…'}</p>
        </main>
      </>
    );
  }

  // Keyed by id so switching CVs starts the editor from a clean slate.
  return <Editor key={record.id} record={record} />;
}

/* ---------- Editor ---------- */
function Editor({ record }) {
  const cvId = record.id;
  const [cv, setCV] = useState(() => toEditorModel(record.content));
  const [meta, setMeta] = useState(() => ({
    title: record.title,
    templateKey: record.templateKey,
    status: record.status,
  }));
  const [templates, setTemplates] = useState([]);

  const [openSections, setOpenSections] = useState({ personal: true, experience: true });
  const [previewTab, setPreviewTab] = useState('preview');
  const [zoom, setZoom] = useState(1);
  const [mobileTab, setMobileTab] = useState('form');
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importSteps, setImportSteps] = useState(null); // null | index of active step
  const [importDone, setImportDone] = useState(false);
  const [exportState, setExportState] = useState('pending'); // pending | processing | complete
  const [saveState, setSaveState] = useState('saved'); // saving | saved | error

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  /* --- Content autosave --- */
  // The document last accepted by the server. New saves are written onto it so
  // sections and keys this editor does not know survive (see cv/content.js).
  const savedDocument = useRef(record.content);
  const savedJson = useRef(JSON.stringify(toContent(toEditorModel(record.content), record.content)));
  // Saves run one at a time, in order, so a slow response can never land after
  // a newer one and leave `savedDocument` stale.
  const saveChain = useRef(Promise.resolve());
  const pendingSave = useRef(null);

  const saveContent = useCallback(
    (model) => {
      const document = toContent(model, savedDocument.current);
      const json = JSON.stringify(document);
      if (json === savedJson.current) {
        setSaveState('saved');
        return;
      }
      setSaveState('saving');
      saveChain.current = saveChain.current.then(() =>
        replaceCvContent(cvId, document)
          .then((saved) => {
            savedDocument.current = saved.content;
            savedJson.current = json;
            setSaveState('saved');
          })
          .catch((err) => {
            setSaveState('error');
            showToast(apiMessage(err, 'Could not save your changes.'));
          })
      );
    },
    [cvId]
  );

  useEffect(() => {
    pendingSave.current = () => saveContent(cv);
    const timer = setTimeout(() => {
      pendingSave.current = null;
      saveContent(cv);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cv, saveContent]);

  // Leaving the page inside the debounce window must not drop the last edit.
  useEffect(() => () => pendingSave.current?.(), []);

  /* --- Metadata --- */
  const savedTitle = useRef(record.title);

  useEffect(() => {
    const title = meta.title.trim();
    if (!title || title === savedTitle.current) return undefined;
    const timer = setTimeout(() => {
      updateCvMeta(cvId, { title })
        .then((saved) => {
          savedTitle.current = saved.title;
        })
        .catch((err) => showToast(apiMessage(err, 'Could not rename this CV.')));
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [meta.title, cvId]);

  const changeMeta = (field, value) => {
    const previous = meta[field];
    setMeta((prev) => ({ ...prev, [field]: value }));
    updateCvMeta(cvId, { [field]: value }).catch((err) => {
      setMeta((prev) => ({ ...prev, [field]: previous }));
      showToast(apiMessage(err, 'Could not update this CV.'));
    });
  };

  const Template = templateComponent(meta.templateKey);
  const currentTemplateName = templateName(templates, meta.templateKey);

  const patch = (updates) => setCV((prev) => ({ ...prev, ...updates }));
  const patchPersonal = (k, v) => setCV((prev) => ({ ...prev, personal: { ...prev.personal, [k]: v } }));
  const patchSkills = (k, v) => setCV((prev) => ({ ...prev, skills: { ...prev.skills, [k]: v } }));

  const patchItem = (list, itemId, k, v) =>
    setCV((prev) => ({ ...prev, [list]: prev[list].map((it) => (it.id === itemId ? { ...it, [k]: v } : it)) }));
  const addItem = (list, blank) => setCV((prev) => ({ ...prev, [list]: [...prev[list], { ...blank, id: newId() }] }));
  const removeItem = (list, itemId) =>
    setCV((prev) => ({ ...prev, [list]: prev[list].filter((it) => it.id !== itemId) }));

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

  // Skills are typed as comma-separated text but stored as lists. The raw text
  // is kept separately so a trailing ", " survives long enough to type the next
  // skill; re-deriving the text from the parsed list would eat it on every key.
  const [skillsDraft, setSkillsDraft] = useState(() => ({
    technical: cv.skills.technical.join(', '),
    soft: cv.skills.soft.join(', '),
  }));
  const changeSkillList = (k, value) => {
    setSkillsDraft((prev) => ({ ...prev, [k]: value }));
    patchSkills(k, value.split(',').map((s) => s.trim()).filter(Boolean));
  };

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
      <span className={`sidebar-check ${done ? 'done' : 'todo'}`}>
        {done ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
        <span className="sr-only">{done ? 'complete' : 'incomplete'}</span>
      </span>
    </a>
  );

  return (
    <>
      <TopNav />

      <div className="mobile-tabs" role="tablist" aria-label="Editor view">
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'form'}
          className={`mobile-tab${mobileTab === 'form' ? ' active' : ''}`}
          onClick={() => setMobileTab('form')}
        >
          Edit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === 'preview'}
          className={`mobile-tab${mobileTab === 'preview' ? ' active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className="builder-layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">CV Content</div>
            {sidebarLink('personal', 'Personal Info', <User aria-hidden="true" />, sectionComplete.personal)}
            {sidebarLink('summary', 'Summary', <FileText aria-hidden="true" />, sectionComplete.summary)}
            {sidebarLink('experience', 'Experience', <Briefcase aria-hidden="true" />, sectionComplete.experience)}
            {sidebarLink('education', 'Education', <GraduationCap aria-hidden="true" />, sectionComplete.education)}
            {sidebarLink('skills', 'Skills', <Wrench aria-hidden="true" />, sectionComplete.skills)}
            {sidebarLink('projects', 'Projects', <Code aria-hidden="true" />, sectionComplete.projects)}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">Actions</div>
            <a className="sidebar-link" href="#" onClick={(e) => { e.preventDefault(); setImportOpen(true); }}>
              <Upload aria-hidden="true" />
              Import CV
            </a>
            <Link className="sidebar-link" to="/scoring">
              <BarChart3 aria-hidden="true" />
              CV Match Analysis
            </Link>
            <a className="sidebar-link" href="#" onClick={(e) => { e.preventDefault(); setExportState('pending'); setExportOpen(true); }}>
              <Download aria-hidden="true" />
              Export PDF
            </a>
          </div>
        </aside>

        <div className="builder-main">
          <div className="form-panel" style={mobileTab === 'preview' ? { display: 'none' } : undefined}>
            <div className="editor-head">
              <div className="min-w-0 flex-1">
                <input
                  className="title-input"
                  value={meta.title}
                  maxLength={255}
                  placeholder="Untitled CV"
                  onChange={(e) => setMeta((prev) => ({ ...prev, title: e.target.value }))}
                  aria-label="CV title"
                />
                <div className="editor-meta">
                  {saveState === 'saving' && (
                    <span className="save-state">
                      <Loader2 className="spin" aria-hidden="true" /> Saving…
                    </span>
                  )}
                  {saveState === 'saved' && (
                    <span className="save-state saved">
                      <Check aria-hidden="true" /> Saved
                    </span>
                  )}
                  {saveState === 'error' && (
                    <span className="save-state error">
                      <AlertCircle aria-hidden="true" /> Not saved —{' '}
                      <button type="button" className="link-btn" style={{ color: 'inherit' }} onClick={() => saveContent(cv)}>
                        retry
                      </button>
                    </span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>Template:</span>
                  {/* A picker only earns its place once the backend offers a choice. */}
                  {templates.length > 1 ? (
                    <select
                      aria-label="Template"
                      className="input inline-select"
                      value={meta.templateKey}
                      onChange={(e) => changeMeta('templateKey', e.target.value)}
                    >
                      {templates.map((t) => (
                        <option key={t.key} value={t.key} title={t.description}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-semibold" style={{ color: 'var(--fg-muted)' }}>{currentTemplateName}</span>
                  )}
                </div>
              </div>
              <div className="editor-actions">
                <select
                  aria-label="CV status"
                  className="input inline-select"
                  value={meta.status}
                  onChange={(e) => changeMeta('status', e.target.value)}
                >
                  <option value={CV_STATUS.DRAFT}>Draft</option>
                  <option value={CV_STATUS.READY}>Ready</option>
                </select>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setImportOpen(true)}>
                  <Upload aria-hidden="true" />
                  Import
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => { setExportState('pending'); setExportOpen(true); }}>
                  <Download aria-hidden="true" />
                  Export PDF
                </button>
              </div>
            </div>

            <div id="personal">
              <Section num="01" title="Personal Information" status={sectionComplete.personal ? 'Complete' : 'Incomplete'} complete={sectionComplete.personal} open={Boolean(openSections.personal)} onToggle={() => toggleSection('personal')}>
                <div className="form-grid-2">
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
                <div className="editor-toolbar">
                  <button type="button" className="icon-btn" aria-label="Bold (planned)" title="Bold (planned)" onClick={() => showToast('Rich text editing is a planned feature')}><Bold aria-hidden="true" /></button>
                  <button type="button" className="icon-btn" aria-label="Italic (planned)" title="Italic (planned)" onClick={() => showToast('Rich text editing is a planned feature')}><Italic aria-hidden="true" /></button>
                  <button type="button" className="icon-btn" aria-label="Link (planned)" title="Link (planned)" onClick={() => showToast('Rich text editing is a planned feature')}><Link2 aria-hidden="true" /></button>
                  <button type="button" className="icon-btn" aria-label="List (planned)" title="List (planned)" onClick={() => showToast('Rich text editing is a planned feature')}><List aria-hidden="true" /></button>
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
                        <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete entry" onClick={() => removeItem('experience', e.id)}><X aria-hidden="true" /></button>
                      </div>
                    </div>
                    <div className="form-grid-2 form-grid-tight">
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Company</label><input type="text" className="input" value={e.company} onChange={(ev) => patchItem('experience', e.id, 'company', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Role</label><input type="text" className="input" value={e.role} onChange={(ev) => patchItem('experience', e.id, 'role', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Start Date</label><input type="month" className="input" value={e.start} onChange={(ev) => patchItem('experience', e.id, 'start', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>End Date</label><input type="month" className="input" value={e.end} disabled={e.current} onChange={(ev) => patchItem('experience', e.id, 'end', ev.target.value)} /></div>
                    </div>
                    <label className="checkbox-row">
                      <input type="checkbox" checked={e.current} onChange={(ev) => patchItem('experience', e.id, 'current', ev.target.checked)} />
                      I currently work here
                    </label>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="label" style={{ fontSize: '0.75rem' }}>Description</label><textarea className="textarea" rows="3" value={e.description} onChange={(ev) => patchItem('experience', e.id, 'description', ev.target.value)} /></div>
                  </div>
                ))}
                <button type="button" className="add-item-btn" onClick={() => addItem('experience', { company: '', role: '', start: '', end: '', current: false, description: '' })}><Plus aria-hidden="true" /> Add experience</button>
              </Section>
            </div>

            <div id="education">
              <Section num="04" title="Education" status={cv.education.length ? `${cv.education.length} ${cv.education.length === 1 ? 'entry' : 'entries'}` : 'Empty'} complete={sectionComplete.education} open={Boolean(openSections.education)} onToggle={() => toggleSection('education')}>
                {cv.education.map((e) => (
                  <div className="array-item" key={e.id}>
                    <div className="array-item-header">
                      <span className="array-item-title">{e.degree || 'New degree'}</span>
                      <div className="array-item-actions">
                        <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete entry" onClick={() => removeItem('education', e.id)}><X aria-hidden="true" /></button>
                      </div>
                    </div>
                    <div className="form-grid-2 form-grid-tight">
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Institution</label><input type="text" className="input" value={e.institution} onChange={(ev) => patchItem('education', e.id, 'institution', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Degree</label><input type="text" className="input" value={e.degree} onChange={(ev) => patchItem('education', e.id, 'degree', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Start Year</label><input type="number" className="input" value={e.startYear} onChange={(ev) => patchItem('education', e.id, 'startYear', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>End Year</label><input type="number" className="input" value={e.endYear} onChange={(ev) => patchItem('education', e.id, 'endYear', ev.target.value)} /></div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="label" style={{ fontSize: '0.75rem' }}>Achievements</label><textarea className="textarea" rows="2" value={e.achievements} onChange={(ev) => patchItem('education', e.id, 'achievements', ev.target.value)} /></div>
                  </div>
                ))}
                <button type="button" className="add-item-btn" onClick={() => addItem('education', { institution: '', degree: '', startYear: '', endYear: '', achievements: '' })}><Plus aria-hidden="true" /> Add education</button>
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
                    value={skillsDraft.technical}
                    onChange={(e) => changeSkillList('technical', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Soft Skills</label>
                  <textarea
                    className="textarea"
                    rows="2"
                    placeholder="Leadership, Communication..."
                    value={skillsDraft.soft}
                    onChange={(e) => changeSkillList('soft', e.target.value)}
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
                        <button type="button" className="icon-btn" title="AI Enhance (planned)" aria-label="AI enhance (planned)" onClick={() => showToast('AI enhancement is a planned backend feature')}><Sparkles aria-hidden="true" /></button>
                        <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete entry" onClick={() => removeItem('projects', pr.id)}><X aria-hidden="true" /></button>
                      </div>
                    </div>
                    <div className="form-grid-2 form-grid-tight">
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Project Name</label><input type="text" className="input" value={pr.name} onChange={(ev) => patchItem('projects', pr.id, 'name', ev.target.value)} /></div>
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}><label className="label" style={{ fontSize: '0.75rem' }}>Link</label><input type="url" className="input" value={pr.link} onChange={(ev) => patchItem('projects', pr.id, 'link', ev.target.value)} /></div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="label" style={{ fontSize: '0.75rem' }}>Description</label><textarea className="textarea" rows="3" value={pr.description} onChange={(ev) => patchItem('projects', pr.id, 'description', ev.target.value)} /></div>
                  </div>
                ))}
                <button type="button" className="add-item-btn" onClick={() => addItem('projects', { name: '', link: '', description: '' })}><Plus aria-hidden="true" /> Add project</button>
              </Section>
            </div>

            <div style={{ height: '4rem' }} />
          </div>

          <div className="preview-panel" style={mobileTab === 'form' ? undefined : { display: 'block', position: 'relative', top: 0, height: 'auto', minHeight: 'calc(100vh - 56px)' }}>
            <div className="preview-toolbar">
              <div className="preview-actions">
                <button type="button" className={`preview-tab${previewTab === 'preview' ? ' active' : ''}`} onClick={() => setPreviewTab('preview')}>Preview</button>
                <button type="button" className={`preview-tab${previewTab === 'ats' ? ' active' : ''}`} onClick={() => setPreviewTab('ats')}>ATS View</button>
                <button type="button" className={`preview-tab${previewTab === 'raw' ? ' active' : ''}`} onClick={() => setPreviewTab('raw')}>Raw</button>
              </div>
              <div className="zoom-controls">
                {[0.75, 1, 1.25].map((z) => (
                  <button type="button" key={z} className={`zoom-btn${zoom === z ? ' active' : ''}`} onClick={() => setZoom(z)}>
                    {Math.round(z * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
              {previewTab === 'preview' && <Template cv={cv} />}
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

            <button type="button" className="btn btn-primary w-full mt-4" onClick={() => { setExportState('pending'); setExportOpen(true); }}>
              <Download aria-hidden="true" />
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
          <button type="button" className="upload-drop" onClick={simulateImport}>
            <span className="icon-chip" aria-hidden="true"><Upload /></span>
            <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>Click to upload or drag and drop</div>
            <div className="text-xs text-muted mt-1">PDF or DOCX, max 5MB (simulated)</div>
          </button>
        )}
        {importSteps !== null && (
          <>
            <div className="import-steps">
              {IMPORT_STEPS.map((label, i) => {
                const state = i < importSteps ? 'done' : i === importSteps ? 'active' : 'pending';
                return (
                  <div className={`import-step ${state}`} key={label}>
                    <div className="import-step-icon">
                      {state === 'done' ? <Check aria-hidden="true" /> : state === 'active' ? <Loader2 className="spin" aria-hidden="true" /> : <Circle aria-hidden="true" />}
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
                <div className="kv-panel text-sm text-muted">
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
          <button type="button" className="btn btn-secondary" onClick={() => showToast('Fetching repositories... (backend endpoint pending)')}>Fetch Repos</button>
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
            {exportState === 'pending' ? <FileText aria-hidden="true" /> : exportState === 'processing' ? <Loader2 className="spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          </div>
          <div>
            <div className="font-medium text-sm">
              {exportState === 'pending' ? 'Ready to export' : exportState === 'processing' ? 'Processing your PDF' : 'Export complete'}
            </div>
            <div className="text-xs" style={{ opacity: 0.85 }}>
              {exportState === 'pending'
                ? 'Your CV will be rendered server-side as a pixel-perfect PDF'
                : exportState === 'processing'
                  ? 'Rendering HTML → Converting to PDF (simulated)'
                  : `${fileName} is ready`}
            </div>
          </div>
        </div>
        <div className="kv-panel">
          <div className="kv-row">
            <span className="font-semibold">Template</span>
            <span>{currentTemplateName}</span>
          </div>
          <div className="kv-row">
            <span className="font-semibold">File name</span>
            <span>{fileName}</span>
          </div>
        </div>
        {exportState === 'complete' && (
          <button type="button" className="btn btn-primary w-full" onClick={downloadExport}>
            <Download aria-hidden="true" />
            Download PDF
          </button>
        )}
      </Modal>
    </>
  );
}
