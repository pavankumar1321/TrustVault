import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * ProtectedRoute — guards a route by authentication and optional role check.
 *
 * Props:
 *   children  — the component to render if allowed
 *   role      — required role string ('admin' | 'owner' | 'viewer'), or undefined for any
 *
 * Security note: this guard is UX only. Every API request is independently
 * re-validated on the backend. A user who manually navigates to a protected URL
 * will see a spinner, then get redirected to /login or /unauthorized — they will
 * never receive real data because the backend will reject their request.
 */
function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  // Still checking session — show full-screen spinner
  if (loading) {
    return <LoadingSpinner fullScreen message="Checking session…" />;
  }

  // Not authenticated — send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role — send to the forbidden page
  if (role && user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;
