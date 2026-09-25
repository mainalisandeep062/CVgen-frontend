import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Copy, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

import TopNav from '@/components/mockui/TopNav';
import ConfirmDialog from '@/components/mockui/ConfirmDialog';
import { showToast } from '@/components/mockui/toast';
import { CV_STATUS, deleteCv, duplicateCv, fetchTemplates, listCvs } from '@/api/cv';
import { apiMessage } from '@/api/response';
import { relativeTime, toTimestamp } from '@/cv/content';
import { templateName } from '@/templates/registry';

/**
 * Dashboard — "Your CVs" grid, backed by the CV API (src/api/cv.js).
 *
 *   list       GET    /api/cvs
 *   new        -> /builder, which POSTs /api/cvs
 *   edit       -> /builder/{id}
 *   duplicate  GET /api/cvs/{id} + POST /api/cvs
 *   delete     DELETE /api/cvs/{id}, behind a confirmation
 *
 * The list rows are summaries — metadata columns only, never the document —
 * so the card shows title, template, status and modified time.
 */

const STATUS_BADGE = {
  [CV_STATUS.DRAFT]: { label: 'Draft', cls: 'badge-draft' },
  [CV_STATUS.READY]: { label: 'Ready', cls: 'badge-exported' },
};

/** Decorative document thumbnail. */
function CvThumb() {
  return (
    <div className="cv-thumb" aria-hidden="true">
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [cvs, setCVs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

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

  return (
    <>
      <TopNav />
      <main className="container">
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Your workspace</div>
            <h1>Your CVs</h1>
            <p className="text-muted text-sm mt-1">
              Manage, analyze, and export your resumes
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/builder')}>
            <Plus aria-hidden="true" />
            New CV
          </button>
        </div>

        {loadState === 'loading' && (
          <div className="cv-grid" role="status" aria-label="Loading your CVs">
            {[0, 1, 2].map((key) => (
              <div className="cv-card" key={key} aria-hidden="true">
                <div className="skeleton" style={{ height: 156, borderRadius: 0 }} />
                <div className="cv-card-body">
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton mt-2" style={{ height: 10, width: '40%' }} />
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

        {loadState === 'ready' && (
          <div className="cv-grid">
            {cvs.map((cv) => {
              const badge = STATUS_BADGE[cv.status] || STATUS_BADGE[CV_STATUS.DRAFT];
              const busy = busyId === cv.id;
              return (
                <div className="cv-card" key={cv.id}>
                  <CvThumb />
                  <div className="cv-card-body">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="cv-card-title">{cv.title}</div>
                        <div className="cv-card-meta">
                          Modified {relativeTime(toTimestamp(cv.updatedAt))} · {templateName(templates, cv.templateKey)}
                        </div>
                      </div>
                      <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="cv-card-actions">
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
                        className="btn btn-sm btn-outline"
                        onClick={() => handleDuplicate(cv)}
                        disabled={busy}
                      >
                        <Copy aria-hidden="true" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-destructive"
                        onClick={() => setDeleteTarget(cv)}
                        disabled={busy}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="cv-card cv-card-new"
              onClick={() => navigate('/builder')}
            >
              <span className="icon-chip" aria-hidden="true">
                <Plus />
              </span>
              <span className="card-title">Create new CV</span>
              <span className="text-muted text-xs mt-1">
                {cvs.length === 0 ? 'Start your first CV' : 'Start from a template'}
              </span>
            </button>
          </div>
        )}
      </main>

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
