import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Common pages
import UnauthorizedPage from './pages/common/UnauthorizedPage';
import NotFoundPage from './pages/common/NotFoundPage';
import ProfilePage from './pages/common/ProfilePage';

// Owner pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import MyDocumentsPage from './pages/owner/MyDocumentsPage';
import OwnerSharedDocsPage from './pages/owner/SharedDocsPage';

// Viewer pages
import ViewerDashboard from './pages/viewer/ViewerDashboard';
import ViewerSharedDocsPage from './pages/viewer/SharedDocsPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import RoleRequestsPage from './pages/admin/RoleRequestsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

/**
 * RootRedirect — after login, sends each role to its own dashboard.
 * Unauthenticated users go to /login.
 */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen message="Loading TrustVault…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'owner') return <Navigate to="/owner/dashboard" replace />;
  return <Navigate to="/viewer/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root — smart redirect based on role */}
          <Route path="/" element={<RootRedirect />} />

          {/* ── Public auth routes ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />

          {/* ── Shared profile (any authenticated role) ── */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ── Admin routes ── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="admin">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/role-requests"
            element={
              <ProtectedRoute role="admin">
                <RoleRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute role="admin">
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* ── Owner routes ── */}
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute role="owner">
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/documents"
            element={
              <ProtectedRoute role="owner">
                <MyDocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/shared"
            element={
              <ProtectedRoute role="owner">
                <OwnerSharedDocsPage />
              </ProtectedRoute>
            }
          />

          {/* ── Viewer routes ── */}
          <Route
            path="/viewer/dashboard"
            element={
              <ProtectedRoute role="viewer">
                <ViewerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/viewer/shared"
            element={
              <ProtectedRoute role="viewer">
                <ViewerSharedDocsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
