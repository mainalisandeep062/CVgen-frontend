import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Check, ChevronDown, Download, Loader2, Pencil, Upload } from 'lucide-react';

import TopNav from '@/components/mockui/TopNav';
import { showToast } from '@/components/mockui/toast';
import BuilderSidebar from '@/components/cv/BuilderSidebar';
import ExportPdfModal from '@/components/cv/ExportPdfModal';
import ImportCvModal from '@/components/cv/ImportCvModal';
import PreviewPanel from '@/components/cv/PreviewPanel';
import TemplatePicker from '@/components/cv/TemplatePicker';
import {
  EducationSection,
  ExperienceSection,
  PersonalSection,
  ProjectsSection,
  SkillsSection,
  SummarySection,
} from '@/components/cv/EditorSections';
import { CV_STATUS, createCv, fetchTemplates, getCv, replaceCvContent, updateCvMeta } from '@/api/cv';
import { apiMessage, apiStatus, unwrap, HTTP } from '@/api/response';
import { appendRepoProjects, atsHealth, newId, relativeTime, sectionStatus, toContent, toEditorModel } from '@/cv/content';
import { templateComponent, templateName } from '@/templates/registry';

import '@/styles/builder.css';

/**
 * Builder - the CV editor. Every field is controlled, edits redraw the live
 * preview instantly, and changes autosave to the backend:
 *
 *   content (all sections)   -> PUT   /api/cvs/{id}        debounced
 *   title                    -> PATCH /api/cvs/{id}/meta   debounced
 *   template / status        -> PATCH /api/cvs/{id}/meta   immediately
 *
 * `/builder` with no id creates a CV (POST /api/cvs) and replaces the URL with
 * `/builder/{id}`, so a refresh edits that CV instead of making another.
 *
 * Import (POST /api/cvs/import, GitHub repos) and PDF export
 * (GET /api/cvs/{id}/export.pdf) live in src/components/cv. A premium template
 * is unlocked with credits from the template picker before it is applied.
 *
 * The form sections, sidebar and preview column are split into
 * src/components/cv; this file owns the state and the autosave.
 */

const AUTOSAVE_DELAY_MS = 800;

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

/* ---------- Page ---------- */
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
  const [activeSection, setActiveSection] = useState('personal');
  const [mobileTab, setMobileTab] = useState('form');
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveState, setSaveState] = useState('saved'); // saving | saved | error
  const [savedAt, setSavedAt] = useState(() => Date.now());
  // Re-render once a minute so "Saved 2m ago" keeps counting.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

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
  // Every write to this CV - content, title, template, status - goes through
  // this one queue. Two requests on the same row at once collide on its
  // optimistic lock, so one tab never sends them in parallel.
  const enqueue = useCallback((write) => {
    const next = saveChain.current.then(write, write);
    saveChain.current = next.catch(() => {});
    return next;
  }, []);
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
      enqueue(() =>
        replaceCvContent(cvId, document)
          .then((saved) => {
            savedDocument.current = saved.content;
            savedJson.current = json;
            setSaveState('saved');
            setSavedAt(Date.now());
          })
          .catch((err) => {
            setSaveState('error');
            showToast(apiMessage(err, 'Could not save your changes.'));
          })
      );
    },
    [cvId, enqueue]
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

  /** Push any pending edit and wait for every queued save - the PDF renders what is saved. */
  const flushSave = useCallback(async () => {
    const pending = pendingSave.current;
    pendingSave.current = null;
    pending?.();
    await saveChain.current;
  }, []);

  /* --- Metadata --- */
  const savedTitle = useRef(record.title);

  useEffect(() => {
    const title = meta.title.trim();
    if (!title || title === savedTitle.current) return undefined;
    const timer = setTimeout(() => {
      enqueue(() => updateCvMeta(cvId, { title }))
        .then((saved) => {
          savedTitle.current = saved.title;
        })
        .catch((err) => showToast(apiMessage(err, 'Could not rename this CV.')));
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [meta.title, cvId, enqueue]);

  const changeMeta = (field, value) => {
    const previous = meta[field];
    setMeta((prev) => ({ ...prev, [field]: value }));
    enqueue(() => updateCvMeta(cvId, { [field]: value })).catch((err) => {
      setMeta((prev) => ({ ...prev, [field]: previous }));
      showToast(apiMessage(err, 'Could not update this CV.'));
    });
  };

  const Template = templateComponent(meta.templateKey);
  const currentTemplateName = templateName(templates, meta.templateKey);

  /* --- Model updaters, handed to the section components --- */
  const ops = {
    patch: (updates) => setCV((prev) => ({ ...prev, ...updates })),
    patchPersonal: (k, v) => setCV((prev) => ({ ...prev, personal: { ...prev.personal, [k]: v } })),
    patchSkills: (k, v) => setCV((prev) => ({ ...prev, skills: { ...prev.skills, [k]: v } })),
    patchItem: (list, itemId, k, v) =>
      setCV((prev) => ({ ...prev, [list]: prev[list].map((it) => (it.id === itemId ? { ...it, [k]: v } : it)) })),
    addItem: (list, blank) => setCV((prev) => ({ ...prev, [list]: [...prev[list], { ...blank, id: newId() }] })),
    removeItem: (list, itemId) => setCV((prev) => ({ ...prev, [list]: prev[list].filter((it) => it.id !== itemId) })),
  };

  const status = sectionStatus(cv);
  const health = atsHealth(cv);

  /* --- Section navigation --- */
  const formRef = useRef(null);
  const toggleSection = (key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const jumpTo = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: true }));
    setActiveSection(key);
    requestAnimationFrame(() =>
      document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  // Highlight the section being read in the sidebar as the form scrolls.
  useEffect(() => {
    const root = formRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed.filter((entry) => entry.isIntersecting);
        if (visible.length) setActiveSection(visible[0].target.dataset.section);
      },
      { rootMargin: '-20% 0px -65% 0px' }
    );
    root.querySelectorAll('[data-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* --- Import --- */
  const replaceContent = (content) => {
    setCV(toEditorModel(content));
    setOpenSections({ personal: true, summary: true, experience: true, education: true, skills: true, projects: true });
    showToast('Imported content applied. Review each section.');
  };

  const addProjects = (repos) => {
    setCV((prev) => appendRepoProjects(prev, repos));
    setOpenSections((prev) => ({ ...prev, projects: true }));
    showToast(`${repos.length} project${repos.length === 1 ? '' : 's'} added from GitHub`);
  };

  const openExport = () => setExportOpen(true);

  // Ctrl/Cmd+P exports the real PDF instead of printing the editor.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const titleRef = useRef(null);

  const formHidden = mobileTab === 'preview';

  return (
    <>
      <TopNav fluid />

      <div className="mobile-tabs bs-mobile-tabs" role="tablist" aria-label="Editor view">
        {[
          { key: 'form', label: 'Edit' },
          { key: 'preview', label: 'Preview' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={mobileTab === t.key}
            className={`mobile-tab${mobileTab === t.key ? ' active' : ''}`}
            onClick={() => setMobileTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bs-layout">
        <BuilderSidebar
          cvId={cvId}
          status={status}
          health={health}
          active={activeSection}
          onJump={jumpTo}
          onImport={() => setImportOpen(true)}
          onExport={openExport}
        />

        <main className={`bs-form${formHidden ? ' hide-mobile' : ''}`} ref={formRef}>
          <div className="bs-head">
            <div className="bs-head-main">
              <div className="bs-title-row">
                <input
                  ref={titleRef}
                  className="bs-title"
                  value={meta.title}
                  maxLength={255}
                  placeholder="Untitled CV"
                  onChange={(e) => setMeta((prev) => ({ ...prev, title: e.target.value }))}
                  aria-label="CV title"
                />
                <button type="button" className="bs-icon-btn" aria-label="Rename CV" onClick={() => titleRef.current?.select()}>
                  <Pencil aria-hidden="true" />
                </button>
              </div>
              <div className="bs-meta">
                {saveState === 'saving' && (
                  <span className="bs-save" role="status">
                    <Loader2 className="spin" aria-hidden="true" /> Saving…
                  </span>
                )}
                {saveState === 'saved' && (
                  <span className="bs-save is-saved" role="status">
                    <Check aria-hidden="true" /> Saved {relativeTime(savedAt)}
                  </span>
                )}
                {saveState === 'error' && (
                  <span className="bs-save is-error" role="alert">
                    <AlertCircle aria-hidden="true" /> Not saved,{' '}
                    <button type="button" className="link-btn" style={{ color: 'inherit' }} onClick={() => saveContent(cv)}>
                      retry
                    </button>
                  </span>
                )}
                <span className="bs-meta-sep" aria-hidden="true">·</span>
                <span className="bs-meta-template">
                  Template:{' '}
                  {templates.length > 1 ? (
                    <TemplatePicker
                      templates={templates}
                      value={meta.templateKey}
                      onSelect={(key) => changeMeta('templateKey', key)}
                      onUnlocked={(unlocked) =>
                        setTemplates((prev) => prev.map((t) => (t.key === unlocked.key ? { ...t, ...unlocked } : t)))
                      }
                    />
                  ) : (
                    <b>{currentTemplateName}</b>
                  )}
                </span>
              </div>
            </div>
            <div className="bs-head-actions">
              <label className={`bs-status ${meta.status === CV_STATUS.READY ? 'is-ready' : 'is-draft'}`}>
                <span className="bs-status-dot" aria-hidden="true" />
                <span className="sr-only">CV status</span>
                <select value={meta.status} onChange={(e) => changeMeta('status', e.target.value)}>
                  <option value={CV_STATUS.DRAFT}>Draft</option>
                  <option value={CV_STATUS.READY}>Ready</option>
                </select>
                <ChevronDown className="bs-status-caret" aria-hidden="true" />
              </label>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setImportOpen(true)}>
                <Upload aria-hidden="true" />
                Import
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={openExport}>
                <Download aria-hidden="true" />
                Export PDF
              </button>
            </div>
          </div>

          <div className="bs-sections">
            {[
              ['personal', PersonalSection],
              ['summary', SummarySection],
              ['experience', ExperienceSection],
              ['education', EducationSection],
              ['skills', SkillsSection],
              ['projects', ProjectsSection],
            ].map(([key, SectionForm]) => (
              <SectionForm
                key={key}
                cv={cv}
                ops={ops}
                state={status[key]}
                open={Boolean(openSections[key])}
                onToggle={() => toggleSection(key)}
                onImportGithub={key === 'projects' ? () => setImportOpen(true) : undefined}
              />
            ))}
          </div>
        </main>

        <PreviewPanel
          cv={cv}
          Template={Template}
          onExport={openExport}
          className={formHidden ? 'show-mobile' : ''}
        />
      </div>

      <ImportCvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        context="builder"
        onReplaceContent={replaceContent}
        onAddProjects={addProjects}
      />

      <ExportPdfModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        cvId={cvId}
        title={meta.title}
        templateLabel={currentTemplateName}
        beforeExport={flushSave}
      />
    </>
  );
}
