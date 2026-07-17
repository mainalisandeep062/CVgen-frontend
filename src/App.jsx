import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import VerifyOtp from '@/pages/VerifyOtp';
import AuthSuccess from '@/pages/AuthSuccess';
import AuthFailure from '@/pages/AuthFailure';
import Dashboard from '@/pages/Dashboard';

/**
 * ProtectedRoute — route guard requiring a non-expired session.
 * Passes only when a token exists AND its `exp` claim is still in the future
 * (both folded into `isAuthenticated`). Otherwise redirects to /login.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/** CatchAllRoute — sends authenticated users to /dashboard, others to /login. */
function CatchAllRoute() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
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
