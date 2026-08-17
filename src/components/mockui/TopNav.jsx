import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import CreditsModal from '@/components/mockui/CreditsModal';
import { useAuth } from '@/context/AuthContext';
import { getBalance } from '@/mock/credits';

function initials(name) {
  if (!name) return 'U';
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U'
  );
}

/**
 * TopNav — shared app navigation from the mock design (logo, page links,
 * credits pill, avatar).
 *
 * The credits pill opens the purchase modal; the balance comes from the mock
 * wallet and live-updates via the `cvgen:credits-changed` event the mock
 * service dispatches. The avatar shows the signed-in user's initials from the
 * real auth token claims and clicking it signs out.
 */
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [balance, setBalance] = useState(getBalance);

  useEffect(() => {
    const sync = () => setBalance(getBalance());
    window.addEventListener('cvgen:credits-changed', sync);
    return () => window.removeEventListener('cvgen:credits-changed', sync);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
            <div
              className="avatar"
              title={`${user?.name || 'Account'} — click to sign out`}
              style={{ cursor: 'pointer' }}
              onClick={handleLogout}
            >
              {initials(user?.name)}
            </div>
          </div>
        </div>
      </nav>
      <CreditsModal open={creditsOpen} onClose={() => setCreditsOpen(false)} />
    </>
  );
}
