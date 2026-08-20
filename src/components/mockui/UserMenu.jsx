import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Avatar from '@/components/mockui/Avatar';
import ProfileModal from '@/components/mockui/ProfileModal';
import ConfirmDialog from '@/components/mockui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';

/**
 * UserMenu — the nav avatar and the account menu behind it.
 *
 * The avatar used to be a bare `onClick={logout}`, so the only thing a user
 * could do with their own account was destroy the session by accident. It is
 * now a menu button: profile, credits, sign out — and sign out is behind a
 * confirmation, since it is the one entry that throws away state.
 *
 * Dismissal is handled here rather than with a library: pointerdown outside the
 * wrapper closes it (pointerdown, not click, so the menu is gone before the
 * click lands on whatever is underneath), Escape closes it and returns focus to
 * the button. The panel is closed before any modal opens so the two never
 * overlap.
 */
export default function UserMenu({ onOpenCredits }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const runItem = (fn) => () => {
    setOpen(false);
    fn();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
      navigate('/');
    }
  };

  return (
    <>
      <div className="user-menu" ref={wrapperRef}>
        <button
          ref={buttonRef}
          type="button"
          className="user-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Avatar user={user} size={28} />
        </button>

        {open && (
          <div className="user-menu-panel" role="menu">
            <div className="user-menu-header">
              <Avatar user={user} size={36} />
              <div className="user-menu-identity">
                <div className="user-menu-name">{user?.name || 'Account'}</div>
                <div className="user-menu-email">{user?.email || ''}</div>
              </div>
            </div>

            <div className="user-menu-sep" />

            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={runItem(() => setProfileOpen(true))}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>

            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={runItem(() => onOpenCredits?.())}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Credits &amp; billing
            </button>

            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={runItem(() => navigate('/dashboard'))}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              My documents
            </button>

            <div className="user-menu-sep" />

            <button
              type="button"
              role="menuitem"
              className="user-menu-item danger"
              onClick={runItem(() => setConfirmOpen(true))}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>

      <ProfileModal
        open={profileOpen}
        user={user}
        onClose={() => setProfileOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        message="You'll need to sign in again to get back to your documents. This device stays trusted, so you may not need a new code."
        confirmLabel="Sign out"
        destructive
        busy={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
