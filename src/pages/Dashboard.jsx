import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TopNav from '@/components/mockui/TopNav';
import Modal from '@/components/mockui/Modal';
import { showToast } from '@/components/mockui/toast';
import {
  listCVs,
  deleteCV,
  duplicateCV,
  relativeTime,
} from '@/mock/cvStore';
import { unlockPremiumTemplate } from '@/mock/credits';

/**
 * Dashboard — "Your CVs" grid from the mock template.
 *
 * DATA SOURCE: the mock cvStore (localStorage). The backend has no CV
 * endpoints yet — every action below (list, duplicate, delete, unlock) maps
 * 1:1 to a planned REST call documented in src/mock/cvStore.js. When the
 * server side lands, only the mock imports change, not this page.
 *
 * Auth identity (avatar initials in the nav) still comes from the REAL JWT
 * claims via useAuth — only the CV data is mocked.
 */

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'badge-draft' },
  exported: { label: 'Exported', cls: 'badge-exported' },
  locked: { label: 'Locked', cls: 'badge-locked' },
};

/** Skeleton document thumbnail, as in the mock template. */
function CvThumb() {
  return (
    <div className="cv-thumb">
      <div className="cv-thumb-inner">
        <div style={{ height: '6px', background: 'var(--fg)', borderRadius: '1px', width: '55%', marginBottom: '5px' }} />
        <div style={{ height: '3px', background: 'var(--border)', borderRadius: '1px', width: '90%', marginBottom: '3px' }} />
        <div style={{ height: '3px', background: 'var(--border)', borderRadius: '1px', width: '75%', marginBottom: '8px' }} />
        <div style={{ height: '3px', background: 'var(--border)', borderRadius: '1px', width: '40%', marginBottom: '3px' }} />
        <div style={{ height: '3px', background: 'var(--border)', borderRadius: '1px', width: '85%' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [cvs, setCVs] = useState(listCVs);
  const [unlockTarget, setUnlockTarget] = useState(null);

  const refresh = () => setCVs(listCVs());

  const handleDelete = (cv) => {
    deleteCV(cv.id);
    showToast(`"${cv.title}" deleted`);
    refresh();
  };

  const handleDuplicate = (cv) => {
    duplicateCV(cv.id);
    showToast('CV duplicated');
    refresh();
  };

  const handleUnlock = () => {
    // MOCK: redeems 1 credit from the localStorage wallet.
    const ok = unlockPremiumTemplate();
    if (ok) {
      showToast('Template unlocked successfully');
      setUnlockTarget(null);
    } else {
      showToast('Not enough credits — purchase a pack first');
    }
  };

  return (
    <>
      <TopNav />
      <div className="container">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1>Your CVs</h1>
            <p className="text-muted text-sm mt-1">
              Manage, analyze, and export your resumes
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/builder')}>
            + New CV
          </button>
        </div>

        <div className="cv-grid" style={{ marginBottom: '4rem' }}>
          {cvs.map((cv) => {
            const badge = STATUS_BADGE[cv.status] || STATUS_BADGE.draft;
            return (
              <div className="cv-card" key={cv.id}>
                <CvThumb />
                <div className="cv-card-body">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="cv-card-title">{cv.title}</div>
                      <div className="cv-card-meta">
                        Modified {relativeTime(cv.updatedAt)} · {cv.template}
                      </div>
                    </div>
                    <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="cv-card-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => navigate(`/builder/${cv.id}`)}
                    >
                      Edit
                    </button>
                    {cv.status === 'locked' ? (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setUnlockTarget(cv)}
                      >
                        Unlock
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleDuplicate(cv)}
                      >
                        Duplicate
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-destructive"
                      onClick={() => handleDelete(cv)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            className="cv-card"
            style={{ borderStyle: 'dashed', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '268px', cursor: 'pointer' }}
            onClick={() => navigate('/builder')}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem', color: 'var(--fg-subtle)', fontSize: '1.25rem', fontWeight: 300 }}>
              +
            </div>
            <div className="font-medium text-sm">Create New CV</div>
            <div className="text-muted text-xs mt-1">Start from a template</div>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(unlockTarget)}
        onClose={() => setUnlockTarget(null)}
        title="Unlock Premium Template"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setUnlockTarget(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleUnlock}>
              Redeem 1 Credit
            </button>
          </>
        }
      >
        <p className="text-muted mb-4">
          This CV uses a premium template. Redeem 1 credit to unlock unlimited
          exports and edits.
        </p>
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <div>
            <div className="font-medium text-sm">
              {unlockTarget?.template} Template
            </div>
            <div className="text-xs text-muted">Clean, two-column layout</div>
          </div>
          <div className="font-bold text-sm">1 credit</div>
        </div>
      </Modal>
    </>
  );
}
