import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Menu,
  Palette,
  ScrollText,
  Users,
  X,
} from 'lucide-react';

import '@/admin/admin.css';
import Brand from '@/components/mockui/Brand';
import Avatar from '@/components/mockui/Avatar';
import { SkeletonRows } from '@/admin/components/States';
import { AdminPageContext } from '@/admin/pageContext';
import { useAuth } from '@/context/AuthContext';
import { ensureAvatarLoaded } from '@/auth/avatarStore';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', Icon: Users },
  { to: '/admin/templates', label: 'Templates', Icon: Palette },
  { to: '/admin/billing', label: 'Billing', Icon: CreditCard },
  { to: '/admin/notifications', label: 'Notifications', Icon: Megaphone },
  { to: '/admin/audit', label: 'Audit log', Icon: ScrollText },
];

/**
 * AdminLayout - shell for every /admin route (the route guard lives in App.jsx).
 *
 * Left sidebar with the admin nav; under 960px it becomes an off-canvas drawer
 * opened from the top bar's menu button (closes on navigation, scrim click or
 * Escape, and is `visibility: hidden` while closed so its links are not
 * tabbable off-screen). Pages set the top-bar title through `usePageTitle`
 * (admin/pageContext.js). The Outlet is wrapped in Suspense because the pages
 * are lazy-loaded chunks.
 */
export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [page, setPageState] = useState({ title: 'Admin', subtitle: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setPage = useCallback((next) => setPageState(next), []);
  const context = useMemo(() => ({ setPage }), [setPage]);

  useEffect(() => {
    ensureAvatarLoaded();
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${page.title} · CVGen Admin`;
  }, [page.title]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <AdminPageContext.Provider value={context}>
      <div className="adm-shell">
        <aside
          id="adm-sidebar"
          className={`adm-sidebar${drawerOpen ? ' open' : ''}`}
          aria-label="Admin navigation"
        >
          <div className="adm-sidebar-head">
            <Brand to="/admin" />
            <span className="adm-brand-tag">Admin</span>
            <button
              type="button"
              className="icon-btn adm-sidebar-close"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <nav className="adm-nav">
            <div className="adm-nav-title">Manage</div>
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `adm-nav-link${isActive ? ' active' : ''}`}
              >
                <Icon aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="adm-sidebar-foot">
            <Link to="/dashboard" className="adm-nav-link">
              <ArrowLeft aria-hidden="true" />
              Back to app
            </Link>
          </div>
        </aside>

        {drawerOpen && <div className="adm-scrim" aria-hidden="true" onClick={() => setDrawerOpen(false)} />}

        <div className="adm-main">
          <header className="adm-topbar">
            <button
              type="button"
              className="btn btn-outline btn-icon adm-menu-btn"
              aria-label="Open navigation"
              aria-controls="adm-sidebar"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <div className="adm-topbar-title">
              <h1>{page.title}</h1>
              {page.subtitle && <div className="adm-topbar-subtitle">{page.subtitle}</div>}
            </div>
            <div className="adm-topbar-user">
              <div className="adm-topbar-identity">
                <div className="adm-topbar-name">{user?.name || 'Admin'}</div>
                <div className="adm-topbar-email">{user?.email || ''}</div>
              </div>
              <Avatar user={user} size={38} />
            </div>
          </header>

          <main className="adm-content">
            <Suspense
              fallback={
                <div className="adm-card">
                  <SkeletonRows rows={6} columns={4} />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </AdminPageContext.Provider>
  );
}
