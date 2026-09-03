import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastContext';
import { Layout } from './components/Layout';
import { AnimatedSplash } from './components/AnimatedSplash';

// Authentication Pages
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';

// Operational Pages
import Dashboard from './pages/Dashboard';
import AddVisit from './pages/AddVisit';
import VisitsList from './pages/VisitsList';
import VisitDetails from './pages/VisitDetails';
import Reports from './pages/Reports';
import AddUser from './pages/AddUser';
import Settings from './pages/Settings';
import ManageUsers from './pages/ManageUsers';
import FollowUps from './pages/FollowUps';
import { CreateQuotation } from './pages/CreateQuotation';

// Native Service Integrations
import { syncOfflineDataToServer } from './services/offlineSync';
import { requestAppPermissions } from './services/permissions';

// Route Guard: Ensures officer is logged in
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

// Admin Route Guard: Restricts critical account/settings management to ADMIN role
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 1. Instantly dismiss native Android OS splash screen window
    SplashScreen.hide().catch(() => {});

    // 2. Request native Android runtime permissions (Camera, GPS, Notifications)
    requestAppPermissions();

    // 3. Initiate offline visit sync matrix with Supabase
    syncOfflineDataToServer();
    window.addEventListener('online', syncOfflineDataToServer);

    return () => {
      window.removeEventListener('online', syncOfflineDataToServer);
    };
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          {/* High-End Animated Splash Screen (Pure White Canvas Theme) */}
          {showSplash && (
            <AnimatedSplash onFinish={() => setShowSplash(false)} />
          )}

          <Routes>
            {/* Public Access Portals */}
            <Route path="/login" element={<Login />} />
            <Route path="/vsfhs-master-portal" element={<AdminLogin />} />

            {/* Field Operations (Officers & Admin) */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/add-visit" element={<ProtectedRoute><AddVisit /></ProtectedRoute>} />
            <Route path="/visits" element={<ProtectedRoute><VisitsList /></ProtectedRoute>} />
            <Route path="/visit/:id" element={<ProtectedRoute><VisitDetails /></ProtectedRoute>} />
            <Route path="/follow-ups" element={<ProtectedRoute><FollowUps /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/create-quotation" element={<ProtectedRoute><CreateQuotation /></ProtectedRoute>} />

            {/* Administrative Level Privilege Controls */}
            <Route path="/add-user" element={<AdminRoute><AddUser /></AdminRoute>} />
            <Route path="/manage-users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
            <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />

            {/* Wildcard Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
