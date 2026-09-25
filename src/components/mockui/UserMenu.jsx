import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, LayoutGrid, LogOut, MonitorSmartphone, ShieldCheck, User } from 'lucide-react';

import Avatar from '@/components/mockui/Avatar';
import ProfileModal from '@/components/mockui/ProfileModal';
import ConfirmDialog from '@/components/mockui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/auth/roles';

/**
 * UserMenu - the nav avatar and the account menu behind it.
 *
 * The avatar used to be a bare `onClick={logout}`, so the only thing a user
 * could do with their own account was destroy the session by accident. It is
 * now a menu button: profile, credits, sign out - and sign out is behind a
 * confirmation, since it is the one entry that throws away state. Admins also
 * get an "Admin console" entry (UI-only gate; see auth/roles.js).
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
  // null | 'this' | 'everywhere' - which sign-out the confirmation is for.
  const [confirmSignOut, setConfirmSignOut] = useState(null);
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
      await logout({ everywhere: confirmSignOut === 'everywhere' });
    } finally {
      setSigningOut(false);
      setConfirmSignOut(null);
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
          <Avatar user={user} size={30} />
        </button>

        {open && (
          <div className="user-menu-panel" role="menu">
            <div className="user-menu-header">
              <Avatar user={user} size={40} />
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
              <User aria-hidden="true" />
              Profile
            </button>

            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={runItem(() => onOpenCredits?.())}
            >
              <Coins aria-hidden="true" />
              Credits &amp; billing
            </button>

            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={runItem(() => navigate('/dashboard'))}
            >
              <LayoutGrid aria-hidden="true" />
              My documents
            </button>

            {isAdmin(user) && (
              <button
                type="button"
                role="menuitem"
                className="user-menu-item accent"
                onClick={runItem(() => navigate('/admin'))}
              >
                <ShieldCheck aria-hidden="true" />
                Admin console
              </button>
            )}

            <div className="user-menu-sep" />

            <button
              type="button"
              role="menuitem"
              className="user-menu-item danger"
              onClick={runItem(() => setConfirmSignOut('this'))}
            >
              <LogOut aria-hidden="true" />
              Sign out
            </button>

            <button
              type="button"
              role="menuitem"
              className="user-menu-item danger"
              onClick={runItem(() => setConfirmSignOut('everywhere'))}
            >
              <MonitorSmartphone aria-hidden="true" />
              Sign out everywhere
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
        open={Boolean(confirmSignOut)}
        title={confirmSignOut === 'everywhere' ? 'Sign out everywhere?' : 'Sign out?'}
        message={
          confirmSignOut === 'everywhere'
            ? 'Every browser and device signed in to your account will be signed out. Each will need to sign in again once its current session runs out.'
            : "You'll need to sign in again to get back to your documents. This device stays trusted, so you may not need a new code."
        }
        confirmLabel={confirmSignOut === 'everywhere' ? 'Sign out everywhere' : 'Sign out'}
        destructive
        busy={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmSignOut(null)}
      />
    </>
  );
}
