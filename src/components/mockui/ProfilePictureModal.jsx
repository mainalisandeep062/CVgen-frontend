import { useCallback, useEffect, useRef, useState } from 'react';

import Modal from '@/components/mockui/Modal';
import { showToast } from '@/components/mockui/toast';
import { apiMessage, unwrap } from '@/api/response';
import { providerLabel } from '@/lib/providers';
import { setAvatarUrl } from '@/auth/avatarStore';
import {
  PROFILE_PICTURE_ACCEPT_ATTRIBUTE,
  deleteProfilePicture,
  fetchProfilePictureOptions,
  selectProfilePictureFromIdentity,
  uploadProfilePicture,
  validateProfilePicture,
} from '@/api/profilePicture';

/**
 * ProfilePictureModal — the "change picture" picker.
 *
 * One call, `GET /api/users/me/profile-picture/options`, is the entire payload:
 * the current picture plus one tile per linked account that publishes an
 * avatar. An email/password-only account gets an empty `providerOptions` and
 * must still be able to upload, so the upload tile is unconditional and the
 * provider tiles are the optional part — not the other way round.
 *
 * Every mutation answers with the new picture, so the avatar store is fed from
 * the response rather than from a guess, and the options are re-read afterwards
 * so the "Current" mark moves. Toast wording comes from the envelope's
 * `message` (localized server-side) — the local strings here are only fallbacks
 * for a request that never reached the server.
 */
export default function ProfilePictureModal({ open, onClose, onChanged }) {
  const fileInputRef = useRef(null);

  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  /** Which action is in flight: 'upload', 'remove' or an identityId. */
  const [busy, setBusy] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setLoadFailed(false);
    }
    try {
      setOptions(await fetchProfilePictureOptions());
      setLoadFailed(false);
    } catch {
      if (!silent) setLoadFailed(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  /**
   * Run one mutation, then adopt the picture it returned.
   *
   * The URL always comes back from the response: picking a picture mints a new
   * fileId and therefore a new URL, so reusing the old one (cache-busted or
   * not) would show the wrong image.
   */
  const runChange = async (key, request, fallbackMessage) => {
    if (busy) return;
    setBusy(key);
    try {
      const response = await request();
      const url = unwrap(response)?.url ?? null;
      setAvatarUrl(url);
      onChanged?.(url);
      showToast(apiMessage(response, fallbackMessage));
      await load({ silent: true });
    } catch (error) {
      showToast(apiMessage(error, 'Could not update your profile picture.'));
    } finally {
      setBusy(null);
    }
  };

  const handleProviderPick = (option) =>
    // Slower than it looks: the server downloads the image from the provider
    // before answering, which is why this tile shows a spinner.
    runChange(
      option.identityId,
      () => selectProfilePictureFromIdentity(option.identityId),
      'Profile picture updated.'
    );

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the same file still fires onChange.
    event.target.value = '';
    if (!file) return;

    const problem = validateProfilePicture(file);
    if (problem) {
      showToast(problem);
      return;
    }

    runChange('upload', () => uploadProfilePicture(file), 'Profile picture updated.');
  };

  const handleRemove = () =>
    runChange('remove', deleteProfilePicture, 'Profile picture removed.');

  const providerOptions = options?.providerOptions ?? [];
  const hasPicture = Boolean(options?.current?.fileId);
  const disabled = Boolean(busy);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change picture"
      footer={
        <>
          {hasPicture && (
            <button
              type="button"
              className="btn btn-ghost btn-sm picture-remove"
              onClick={handleRemove}
              disabled={disabled}
            >
              {busy === 'remove' ? 'Removing…' : 'Remove picture'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {loading && (
        <div className="picture-grid">
          <div className="skeleton" style={{ height: 116 }} />
          <div className="skeleton" style={{ height: 116 }} />
          <div className="skeleton" style={{ height: 116 }} />
        </div>
      )}

      {!loading && loadFailed && (
        <div className="text-sm text-muted">
          Could not load your picture options right now.{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => load()}>
            Try again
          </button>
        </div>
      )}

      {!loading && !loadFailed && (
        <>
          <div className="picture-grid">
            {providerOptions.map((option) => (
              <button
                key={option.identityId}
                type="button"
                className={`picture-tile${option.selected ? ' selected' : ''}`}
                onClick={() => handleProviderPick(option)}
                disabled={disabled}
                aria-busy={busy === option.identityId}
              >
                <span className="picture-tile-thumb">
                  <img
                    src={option.avatarUrl}
                    alt=""
                    /* Provider CDNs reject a referrer from another origin. */
                    referrerPolicy="no-referrer"
                  />
                  {busy === option.identityId && <span className="picture-spinner" />}
                </span>
                <span className="picture-tile-label">
                  {providerLabel(option.provider)}
                </span>
                {option.selected && <span className="picture-tile-badge">Current</span>}
              </button>
            ))}

            <button
              type="button"
              className="picture-tile picture-tile-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              aria-busy={busy === 'upload'}
            >
              <span className="picture-tile-thumb">
                {busy === 'upload' ? (
                  <span className="picture-spinner" />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                )}
              </span>
              <span className="picture-tile-label">Upload a photo</span>
            </button>
          </div>

          <p className="text-xs text-muted mt-3">
            {providerOptions.length === 0
              ? 'Upload a JPEG, PNG, WebP or GIF, up to 2 MB.'
              : 'Pick a linked account, or upload a JPEG, PNG, WebP or GIF up to 2 MB.'}
          </p>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={PROFILE_PICTURE_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={handleFile}
      />
    </Modal>
  );
}
