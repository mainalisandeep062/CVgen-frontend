import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import VerifyOtp from '@/pages/VerifyOtp';
import AuthSuccess from '@/pages/AuthSuccess';
import AuthFailure from '@/pages/AuthFailure';
import Dashboard from '@/pages/Dashboard';
import Builder from '@/pages/Builder';
import Scoring from '@/pages/Scoring';

/**
 * BootstrapSplash — shown while the one-shot /api/auth/refresh on app load is
 * still in flight. Route guards render this instead of deciding auth, so a valid
 * session surviving in the httpOnly refresh cookie is never bounced to /login
 * just because the in-memory access token hasn't been re-minted yet.
 */
function BootstrapSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * ProtectedRoute — route guard requiring a non-expired session.
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

/** CatchAllRoute — sends unknown routes to the public landing page. */
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
