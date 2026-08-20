import { useEffect, useRef, useState } from 'react';

import Modal from '@/components/mockui/Modal';
import Avatar from '@/components/mockui/Avatar';
import { showToast } from '@/components/mockui/toast';
import { fetchCurrentUser } from '@/api/user';
import {
  fileToAvatarDataUrl,
  setLocalAvatar,
  clearLocalAvatar,
  getLocalAvatar,
  AVATAR_CHANGED_EVENT,
} from '@/auth/avatarStore';

const PROVIDER_LABELS = {
  google: 'Google',
  github: 'GitHub',
  linkedin: 'LinkedIn',
};

/** "2026-08-20T09:31:00" → "20 Aug 2026". Blank when the server sent nothing. */
function formatJoined(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * ProfileModal — account details plus the profile picture.
 *
 * Details come from `GET /api/users/me`, not from the decoded JWT: the token is
 * a snapshot from issue time and carries neither `providers` nor the
 * email-verified flag. The JWT claims are still passed in as `user` so the
 * modal can render a name and an avatar during the fetch, and so it degrades to
 * something useful if the request fails.
 *
 * The picture is browser-local for now (see auth/avatarStore) — that is stated
 * in the UI rather than left to look like a real upload that silently does not
 * follow the user to another device.
 */
export default function ProfileModal({ open, user, onClose }) {
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasLocalPhoto, setHasLocalPhoto] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    setLoading(true);
    setFailed(false);
    fetchCurrentUser()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Whether a "Remove photo" action makes sense — only a local upload can be
  // removed here; a provider-supplied image is not ours to delete.
  useEffect(() => {
    const sync = () => setHasLocalPhoto(Boolean(getLocalAvatar(user)));
    sync();
    window.addEventListener(AVATAR_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AVATAR_CHANGED_EVENT, sync);
  }, [user, open]);

  const handlePick = async (event) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the same file still fires onChange.
    event.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      if (setLocalAvatar(user, dataUrl)) {
        showToast('Profile picture updated');
      } else {
        showToast('Could not save the picture in this browser');
      }
    } catch (err) {
      showToast(err.message || 'Could not use that image');
    }
  };

  const handleRemove = () => {
    clearLocalAvatar(user);
    showToast('Profile picture removed');
  };

  const name = profile?.name || user?.name || 'Your account';
  const email = profile?.email || user?.email || '—';
  const providers = profile?.providers || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="profile-photo-row">
        <Avatar user={user} size={72} />
        <div>
          <div className="font-semibold text-base">{name}</div>
          <div className="text-sm text-muted">{email}</div>
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {hasLocalPhoto ? 'Change photo' : 'Upload photo'}
            </button>
            {hasLocalPhoto && (
              <button className="btn btn-ghost btn-sm" onClick={handleRemove}>
                Remove
              </button>
            )}
          </div>
          <div className="text-xs text-muted mt-2">
            Stored in this browser for now — cloud storage is coming.
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePick}
        />
      </div>

      <div className="divider" />

      {loading && <div className="skeleton" style={{ height: 96 }} />}

      {!loading && failed && (
        <p className="text-sm text-muted">
          Could not load your account details right now.
        </p>
      )}

      {!loading && !failed && (
        <dl className="profile-details">
          <dt>Name</dt>
          <dd>{name}</dd>

          <dt>Email</dt>
          <dd>
            {email}{' '}
            {profile?.isEmailVerified ? (
              <span className="keyword-pill pill-match">Verified</span>
            ) : (
              <span className="keyword-pill pill-optional">Unverified</span>
            )}
          </dd>

          <dt>Member since</dt>
          <dd>{formatJoined(profile?.createdAt)}</dd>

          <dt>Sign-in</dt>
          <dd>
            {providers.length > 0 ? (
              <span className="flex gap-1">
                {providers.map((p) => (
                  <span key={p} className="keyword-pill pill-optional">
                    {PROVIDER_LABELS[p] || p}
                  </span>
                ))}
              </span>
            ) : (
              'Email and password'
            )}
          </dd>
        </dl>
      )}
    </Modal>
  );
}
