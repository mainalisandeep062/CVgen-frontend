import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { isAdmin } from '@/auth/roles';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import VerifyOtp from '@/pages/VerifyOtp';
import AuthSuccess from '@/pages/AuthSuccess';
import AuthFailure from '@/pages/AuthFailure';
import Dashboard from '@/pages/Dashboard';
import Builder from '@/pages/Builder';
import Scoring from '@/pages/Scoring';
import BillingReturn from '@/pages/BillingReturn';

// The admin console is code-split: recharts and the admin screens only load
// for someone who actually opens /admin. AdminLayout wraps its <Outlet/> in
// Suspense, so a lazy page shows the layout's skeleton while its chunk loads.
const AdminLayout = lazy(() => import('@/admin/AdminLayout'));
const AdminOverview = lazy(() => import('@/pages/admin/Overview'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminUserDetail = lazy(() => import('@/pages/admin/UserDetail'));
const AdminTemplates = lazy(() => import('@/pages/admin/Templates'));
const AdminBilling = lazy(() => import('@/pages/admin/Billing'));
const AdminNotifications = lazy(() => import('@/pages/admin/Notifications'));
const AdminAudit = lazy(() => import('@/pages/admin/AuditLog'));

/**
 * BootstrapSplash - shown while the one-shot /api/auth/refresh on app load is
 * still in flight. Route guards render this instead of deciding auth, so a valid
 * session surviving in the httpOnly refresh cookie is never bounced to /login
 * just because the in-memory access token hasn't been re-minted yet.
 */
function BootstrapSplash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-spinner" aria-hidden="true" />
      <p className="splash-text">Loading CVGen…</p>
    </div>
  );
}

/**
 * ProtectedRoute - route guard requiring a non-expired session.
 * Waits for the auth bootstrap to settle, then passes only when a token exists
 * AND its `exp` claim is still in the future (both folded into
 * `isAuthenticated`). Otherwise redirects to /login.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, bootstrapped } = useAuth();
  if (!bootstrapped) {
    return <BootstrapSplash />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * AdminRoute - ProtectedRoute plus a ROLE_ADMIN check on the decoded token.
 *
 * Same bootstrap wait as ProtectedRoute. Unauthenticated → /login; signed in
 * without ROLE_ADMIN → /dashboard. This is a UI gate only (see auth/roles.js):
 * the backend enforces the role on every /api/admin/** call, so a stale token
 * that still claims ROLE_ADMIN just gets 403s, which the admin pages surface as
 * an error state rather than rendering data.
 */
function AdminRoute({ children }) {
  const { isAuthenticated, bootstrapped, user } = useAuth();
  if (!bootstrapped) {
    return <BootstrapSplash />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/** CatchAllRoute - sends unknown routes to the public landing page. */
function CatchAllRoute() {
  const { bootstrapped } = useAuth();
  if (!bootstrapped) {
    return <BootstrapSplash />;
  }
  return <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/auth/success" element={<AuthSuccess />} />
      <Route path="/auth/failure" element={<AuthFailure />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/builder"
        element={
          <ProtectedRoute>
            <Builder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/builder/:id"
        element={
          <ProtectedRoute>
            <Builder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scoring"
        element={
          <ProtectedRoute>
            <Scoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing/return/:gateway"
        element={
          <ProtectedRoute>
            <BillingReturn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="templates" element={<AdminTemplates />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
      <Route path="*" element={<CatchAllRoute />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}
