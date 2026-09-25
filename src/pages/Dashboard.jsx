import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Copy, FileText, Pencil, Plus, RefreshCw, Search, Sparkles, Upload } from 'lucide-react';

import TopNav from '@/components/mockui/TopNav';
import ConfirmDialog from '@/components/mockui/ConfirmDialog';
import { showToast } from '@/components/mockui/toast';
import CvCardMenu from '@/components/cv/CvCardMenu';
import ImportCvModal from '@/components/cv/ImportCvModal';
import { CV_STATUS, deleteCv, duplicateCv, exportCvPdf, fetchTemplates, listCvs, saveBlob } from '@/api/cv';
import { apiMessage } from '@/api/response';
import { relativeTime, toTimestamp } from '@/cv/content';
import { templateName } from '@/templates/registry';

import '@/styles/dashboard.css';

/**
 * Dashboard - "Your CVs" grid, backed by the CV API (src/api/cv.js).
 *
 *   list       GET    /api/cvs
 *   new        -> /builder, which POSTs /api/cvs
 *   import     ImportCvModal -> POST /api/cvs/import, then POST /api/cvs
 *   edit       -> /builder/{id}
 *   duplicate  GET /api/cvs/{id} + POST /api/cvs
 *   export     GET /api/cvs/{id}/export.pdf
 *   analyze    -> /scoring?cv={id}
 *   delete     DELETE /api/cvs/{id}, behind a confirmation
 *
 * The list rows are summaries - metadata columns only, never the document -
 * so the card shows title, template, status and modified time. The status
 * filter and title search run on the client over that list.
 */

const STATUS_BADGE = {
  [CV_STATUS.DRAFT]: { label: 'Draft', cls: 'badge-draft' },
  [CV_STATUS.READY]: { label: 'Ready', cls: 'badge-exported' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: CV_STATUS.READY, label: 'Ready' },
  { key: CV_STATUS.DRAFT, label: 'Drafts' },
];

/** Decorative document thumbnail with the status pill in its corner. */
function CvThumb({ badge }) {
  return (
    <div className="cv-thumb dash-thumb" aria-hidden="true">
      <span className={`status-badge ${badge.cls} dash-thumb-badge`}>{badge.label}</span>
      <div className="cv-thumb-inner">
        <div className="thumb-line heading" />
        <div className="thumb-line" style={{ width: '90%' }} />
        <div className="thumb-line" style={{ width: '75%' }} />
        <div className="thumb-line accent" />
        <div className="thumb-line" style={{ width: '85%' }} />
        <div className="thumb-line" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

function EmptyState({ onNew, onImport }) {
  return (
    <div className="dash-empty">
      <div className="dash-empty-art" aria-hidden="true">
        <FileText />
        <Sparkles className="dash-empty-spark" />
      </div>
      <h2>No CVs yet</h2>
      <p>Create your first ATS-friendly CV in minutes</p>
      <div className="flex gap-2 justify-center flex-wrap mt-4">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <Plus aria-hidden="true" />
          New CV
        </button>
        <button type="button" className="btn btn-outline" onClick={onImport}>
          <Upload aria-hidden="true" />
          Import existing CV
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [cvs, setCVs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const page = await listCvs();
      setCVs(page?.items ?? []);
      setLoadState('ready');
    } catch (error) {
      setLoadState('error');
      showToast(apiMessage(error, 'Could not load your CVs.'));
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [refresh]);

  const stats = useMemo(() => {
    const ready = cvs.filter((cv) => cv.status === CV_STATUS.READY).length;
    const latest = cvs.reduce((max, cv) => Math.max(max, toTimestamp(cv.updatedAt)), 0);
    return { total: cvs.length, ready, drafts: cvs.length - ready, latest };
  }, [cvs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cvs.filter(
      (cv) =>
        (filter === 'all' || cv.status === filter) && (!q || (cv.title || '').toLowerCase().includes(q))
    );
  }, [cvs, filter, query]);

  const handleDelete = async () => {
    const cv = deleteTarget;
    setBusyId(cv.id);
    try {
      const response = await deleteCv(cv.id);
      showToast(apiMessage(response, `"${cv.title}" deleted`));
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      showToast(apiMessage(error, 'Could not delete this CV.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (cv) => {
    setBusyId(cv.id);
    try {
      const response = await duplicateCv(cv.id);
      showToast(apiMessage(response, 'CV duplicated'));
      await refresh();
    } catch (error) {
      // 409 at the per-user cap carries its own "you can only have N CVs" wording.
      showToast(apiMessage(error, 'Could not duplicate this CV.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async (cv) => {
    setBusyId(cv.id);
    showToast(`Rendering "${cv.title}"…`);
    try {
      const { blob, fileName } = await exportCvPdf(cv.id);
      saveBlob(blob, fileName);
      showToast('PDF downloaded');
    } catch (error) {
      showToast(apiMessage(error, 'The PDF could not be created. Try again in a moment.'));
    } finally {
      setBusyId(null);
    }
  };

  const newCv = () => navigate('/builder');

  return (
    <>
      <TopNav />
      <main className="container dash">
        <div className="page-header dash-header">
          <div>
            <div className="page-eyebrow">Your workspace</div>
            <h1>Your CVs</h1>
            <p className="text-muted text-sm mt-1">Manage, analyze, and export your resumes</p>
          </div>
          <div className="dash-header-actions">
            <button type="button" className="btn btn-outline" onClick={() => setImportOpen(true)}>
              <Upload aria-hidden="true" />
              Import CV
            </button>
            <button type="button" className="btn btn-primary" onClick={newCv}>
              <Plus aria-hidden="true" />
              New CV
            </button>
          </div>
        </div>

        {loadState === 'loading' && (
          <div className="cv-grid dash-grid" role="status" aria-label="Loading your CVs">
            {[0, 1, 2].map((key) => (
              <div className="cv-card" key={key} aria-hidden="true">
                <div className="skeleton" style={{ height: 156, borderRadius: 0 }} />
                <div className="cv-card-body">
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton mt-2" style={{ height: 10, width: '40%' }} />
                  <div className="skeleton mt-4" style={{ height: 30, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {loadState === 'error' && (
          <div className="alert alert-warning inline-error" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>Your CVs could not be loaded.</span>
            <button type="button" className="btn btn-sm btn-outline" style={{ marginLeft: 'auto' }} onClick={refresh}>
              <RefreshCw aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {loadState === 'ready' && cvs.length === 0 && (
          <EmptyState onNew={newCv} onImport={() => setImportOpen(true)} />
        )}

        {loadState === 'ready' && cvs.length > 0 && (
          <>
            <p className="dash-stats">
              <span><b>{stats.total}</b> {stats.total === 1 ? 'CV' : 'CVs'}</span>
              <span aria-hidden="true">·</span>
              <span><b>{stats.ready}</b> Ready</span>
              <span aria-hidden="true">·</span>
              <span><b>{stats.drafts}</b> {stats.drafts === 1 ? 'Draft' : 'Drafts'}</span>
              <span aria-hidden="true">·</span>
              <span>Last edited {relativeTime(stats.latest)}</span>
            </p>

            <div className="dash-toolbar">
              <div className="segmented dash-filter" role="group" aria-label="Filter by status">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className="segmented-btn"
                    aria-pressed={filter === f.key}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="dash-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Search CVs by title</span>
                <input
                  type="search"
                  className="input"
                  placeholder="Search by title"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>

            {visible.length === 0 && (
              <p className="dash-no-match">
                No CVs match.{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setFilter('all');
                    setQuery('');
                  }}
                >
                  Clear filters
                </button>
              </p>
            )}

            <div className="cv-grid dash-grid">
              {visible.map((cv) => {
                const badge = STATUS_BADGE[cv.status] || STATUS_BADGE[CV_STATUS.DRAFT];
                const busy = busyId === cv.id;
                return (
                  <article className="cv-card dash-card" key={cv.id} aria-busy={busy || undefined}>
                    <CvThumb badge={badge} />
                    <div className="cv-card-body">
                      <h2 className="cv-card-title">{cv.title}</h2>
                      <div className="cv-card-meta">
                        Modified {relativeTime(toTimestamp(cv.updatedAt))} · {templateName(templates, cv.templateKey)}
                      </div>
                      <div className="cv-card-actions dash-card-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate(`/builder/${cv.id}`)}
                        >
                          <Pencil aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost btn-icon"
                          onClick={() => handleDuplicate(cv)}
                          disabled={busy}
                          aria-label={`Duplicate ${cv.title}`}
                          title="Duplicate"
                        >
                          <Copy aria-hidden="true" />
                        </button>
                        <span className="dash-spacer" />
                        <CvCardMenu
                          cv={cv}
                          disabled={busy}
                          onExport={() => handleExport(cv)}
                          onDelete={() => setDeleteTarget(cv)}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}

              {filter === 'all' && !query.trim() && (
                <button type="button" className="cv-card cv-card-new" onClick={newCv}>
                  <span className="icon-chip" aria-hidden="true">
                    <Plus />
                  </span>
                  <span className="card-title">Create new CV</span>
                  <span className="text-muted text-xs mt-1">Start from a template</span>
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <ImportCvModal open={importOpen} onClose={() => setImportOpen(false)} context="dashboard" />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this CV?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busy={Boolean(deleteTarget) && busyId === deleteTarget?.id}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
