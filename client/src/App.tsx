import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import LabEnvironment from './pages/LabEnvironment';
import AdminManagement from './pages/AdminManagement';
import ResetPassword from './pages/ResetPassword';
import LocalLabTerminal from './pages/LocalLabTerminal';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PermissionProtectedRoute({ children, permissions }: { children: React.ReactNode; permissions: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Admin always has access, otherwise check if user has any of the required permissions
  const hasPermission = user.role === 'admin' || permissions.some(p => user.permissions?.includes(p));

  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-slate-300 mb-6">You don't have permission to access this page.</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl font-bold transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab/:labId"
        element={
          <ProtectedRoute>
            <LabEnvironment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings/:bookingId/terminal"
        element={
          <ProtectedRoute>
            <LocalLabTerminal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/management"
        element={
          <PermissionProtectedRoute permissions={['manage_users', 'manage_labs', 'provision_labs', 'manage_roles', 'view_feedback', 'view_analytics', 'manage_settings', 'view_submissions', 'grade_submissions']}>
            <AdminManagement />
          </PermissionProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />    </Routes>
  );
}

function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { branding } = useAuth();

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        null;
  };

  React.useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      if (branding.primaryColor) {
        root.style.setProperty('--primary-color', branding.primaryColor);
        const rgb = hexToRgb(branding.primaryColor);
        if (rgb) root.style.setProperty('--primary-rgb', rgb);
      }
      if (branding.secondaryColor) {
        root.style.setProperty('--secondary-color', branding.secondaryColor);
        const rgb = hexToRgb(branding.secondaryColor);
        if (rgb) root.style.setProperty('--secondary-rgb', rgb);
      }
    }
  }, [branding]);

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <BrandingProvider>
          <AppRoutes />
        </BrandingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
