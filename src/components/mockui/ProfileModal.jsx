import { useCallback, useEffect, useState } from 'react';

import Modal from '@/components/mockui/Modal';
import Avatar from '@/components/mockui/Avatar';
import ProfilePictureModal from '@/components/mockui/ProfilePictureModal';
import { fetchCurrentUser } from '@/api/user';
import { providerLabel } from '@/lib/providers';
import { setAvatarUrl } from '@/auth/avatarStore';

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
 * That same fetch carries `profilePictureUrl`, so it doubles as the seam that
 * feeds server truth into the avatar store — one request, not two. Changing the
 * picture happens in ProfilePictureModal, which owns the whole picker.
 */
export default function ProfileModal({ open, user, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pictureOpen, setPictureOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await fetchCurrentUser();
      setProfile(data);
      // Server truth for the avatar, free with the details request.
      setAvatarUrl(data?.profilePictureUrl ?? null);
      return data;
    } catch {
      setFailed(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadProfile();
  }, [open, loadProfile]);

  const name = profile?.name || user?.name || 'Your account';
  const email = profile?.email || user?.email || '—';
  const providers = profile?.providers || [];

  return (
    <>
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
                onClick={() => setPictureOpen(true)}
              >
                Change picture
              </button>
            </div>
          </div>
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
                  {providers.map((provider) => (
                    <span key={provider} className="keyword-pill pill-optional">
                      {providerLabel(provider)}
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

      <ProfilePictureModal
        open={pictureOpen}
        onClose={() => setPictureOpen(false)}
        // Keep the details pane's own copy of the URL honest, so reopening this
        // modal without a refetch cannot show a picture that no longer exists.
        onChanged={(url) =>
          setProfile((current) =>
            current ? { ...current, profilePictureUrl: url } : current
          )
        }
      />
    </>
  );
}
