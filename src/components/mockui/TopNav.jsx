import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import CreditsModal from '@/components/mockui/CreditsModal';
import UserMenu from '@/components/mockui/UserMenu';
import { getBalance } from '@/mock/credits';

/**
 * TopNav — shared app navigation from the mock design (logo, page links,
 * credits pill, account menu).
 *
 * The credits pill opens the purchase modal; the balance comes from the mock
 * wallet and live-updates via the `cvgen:credits-changed` event the mock
 * service dispatches. The avatar opens UserMenu, which owns everything
 * account-shaped (profile, sign out) — it used to sign the user out on a single
 * click, with no menu and no confirmation.
 */
export default function TopNav() {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [balance, setBalance] = useState(getBalance);

  useEffect(() => {
    const sync = () => setBalance(getBalance());
    window.addEventListener('cvgen:credits-changed', sync);
    return () => window.removeEventListener('cvgen:credits-changed', sync);
  }, []);

  return (
    <>
      <nav className="topnav">
        <div className="container topnav-inner">
          <Link to="/" className="topnav-logo">
            CVGen
          </Link>
          <div className="topnav-links">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/builder"
              className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}
            >
              Builder
            </NavLink>
            <div className="credit-pill" onClick={() => setCreditsOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              {balance} credits
            </div>
            <UserMenu onOpenCredits={() => setCreditsOpen(true)} />
          </div>
        </div>
      </nav>
      <CreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </>
  );
}
