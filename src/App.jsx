import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AuthSuccess from './pages/AuthSuccess';
import AuthFailure from './pages/AuthFailure';
import Dashboard from './pages/Dashboard';

/**
 * ProtectedRoute - route guard that checks authentication.
 *
 * Conditions to pass:
 *  (a) a token exists in storage, AND
 *  (b) its `exp` claim is in the future
 *
 * If either check fails, redirect to /login.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * CatchAllRoute - redirects based on auth state.
 *
 * If authenticated → /dashboard
 * If not authenticated → /login
 */
function CatchAllRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
    </AuthProvider>
  );
}
