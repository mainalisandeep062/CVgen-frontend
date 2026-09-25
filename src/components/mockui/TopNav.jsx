import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Coins, LayoutGrid, PenLine, ShieldCheck } from 'lucide-react';

import Brand from '@/components/mockui/Brand';
import CreditsModal from '@/components/mockui/CreditsModal';
import NotificationBell from '@/components/mockui/NotificationBell';
import UserMenu from '@/components/mockui/UserMenu';
import { CREDITS_CHANGED_EVENT, OPEN_CREDITS_EVENT } from '@/components/mockui/creditsEvents';
import { getMyBillingAccount } from '@/api/billing';
import { ensureAvatarLoaded } from '@/auth/avatarStore';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/auth/roles';
import '@/styles/account.css';

const navClass = ({ isActive }) => `topnav-link${isActive ? ' active' : ''}`;

/**
 * TopNav - shared app navigation (logo, page links, credits pill,
 * notifications, account menu).
 *
 * The credits pill opens the Buy credits modal; the balance is the REAL one
 * from GET /api/billing/me, refetched on the `cvgen:credits-changed` event
 * (creditsEvents.js) so a payment, unlock or admin grant shows up without a
 * reload. `cvgen:open-credits` opens the modal from other pages (the billing
 * return page's "Try again"). It stays hidden until the first read
 * succeeds - a wrong number is worse than none. The avatar opens UserMenu,
 * which owns everything
 * account-shaped (profile, sign out) - it used to sign the user out on a single
 * click, with no menu and no confirmation.
 *
 * The "Admin" link renders only when the decoded token carries ROLE_ADMIN. That
 * is cosmetic - the /admin route guard and, ultimately, the backend decide.
 *
 * This is also where the profile picture is first read from the server, since
 * the nav is on every authenticated page. The retry matters: after a first-time
 * OAuth signup the backend seeds the provider picture ASYNCHRONOUSLY, so
 * `profilePictureUrl` is legitimately null for a moment after landing here. The
 * user sees initials and the picture fills itself in - the redirect is never
 * blocked waiting for it.
 */
/** @param fluid  full-width bar, for app-shell pages such as the builder */
export default function TopNav({ fluid = false }) {
  const { user } = useAuth();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    ensureAvatarLoaded({ retryDelayMs: 4000 });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      getMyBillingAccount()
        .then((account) => {
          if (!cancelled) setBalance(account?.balance ?? 0);
        })
        .catch(() => {
          // Leave the pill hidden rather than showing a stale or invented
          // balance; the bell and the rest of the nav still work.
        });
    };
    sync();
    window.addEventListener(CREDITS_CHANGED_EVENT, sync);
    return () => {
      cancelled = true;
      window.removeEventListener(CREDITS_CHANGED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    const open = () => setCreditsOpen(true);
    window.addEventListener(OPEN_CREDITS_EVENT, open);
    return () => window.removeEventListener(OPEN_CREDITS_EVENT, open);
  }, []);

  return (
    <>
      <nav className="topnav" aria-label="Main">
        <div className={`container topnav-inner${fluid ? ' topnav-fluid' : ''}`}>
          <div className="nav-brand">
            <Brand compact />
            <span className="nav-market" title="Built for the Nepali job market">Nepal</span>
          </div>
          <div className="topnav-links">
            <NavLink to="/dashboard" className={navClass}>
              <LayoutGrid aria-hidden="true" />
              <span className="topnav-link-label">Dashboard</span>
            </NavLink>
            <NavLink to="/builder" className={navClass}>
              <PenLine aria-hidden="true" />
              <span className="topnav-link-label">Builder</span>
            </NavLink>
            {isAdmin(user) && (
              <NavLink to="/admin" className={navClass}>
                <ShieldCheck aria-hidden="true" />
                <span className="topnav-link-label">Admin</span>
              </NavLink>
            )}
            <span className="topnav-sep" aria-hidden="true" />
            {balance !== null && (
              <button
                type="button"
                className="credit-pill"
                onClick={() => setCreditsOpen(true)}
                aria-label={`${balance} credits, buy credits`}
              >
                <Coins aria-hidden="true" />
                {balance}
                <span className="credit-pill-label">credits</span>
              </button>
            )}
            <NotificationBell />
            <UserMenu onOpenCredits={() => setCreditsOpen(true)} />
          </div>
        </div>
      </nav>
      <CreditsModal
        open={creditsOpen}
        balance={balance}
        onClose={() => setCreditsOpen(false)}
      />
    </>
  );
}
