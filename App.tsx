import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
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
import { syncOfflineDataToServer } from './services/offlineSync';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 1. Instantly hide native Android OS splash screen container
    SplashScreen.hide().catch(() => {});

    // 2. Keep the full-screen poster overlay visible for 2 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    // 🌟 OFFLINE SYNC MATRIX: Listens globally for phone network updates
    syncOfflineDataToServer();

    window.addEventListener('online', syncOfflineDataToServer);

    return () => {
      clearTimeout(splashTimer);
      window.removeEventListener('online', syncOfflineDataToServer);
    };
  }, []);

  // 🖼️ Renders full poster image cleanly with zero circular cropping or blur
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#f8fafc] flex items-center justify-center z-50 p-6 select-none">
        <img
          src="/splash.png"
          alt="Vidhya Security Force & Housekeeping Services"
          className="w-full h-full object-contain max-w-sm"
        />
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Access Portals */}
          <Route path="/login" element={<Login />} />
          <Route path="/vsfhs-master-portal" element={<AdminLogin />} />

          {/* Protected Field Operations & Marketing Roster */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/add-visit" element={<ProtectedRoute><AddVisit /></ProtectedRoute>} />
          <Route path="/visits" element={<ProtectedRoute><VisitsList /></ProtectedRoute>} />
          <Route path="/visit/:id" element={<ProtectedRoute><VisitDetails /></ProtectedRoute>} />
          <Route path="/follow-ups" element={<ProtectedRoute><FollowUps /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/create-quotation" element={<ProtectedRoute><CreateQuotation /></ProtectedRoute>} />

          {/* Administrative Privilege Routing Control */}
          <Route path="/add-user" element={<ProtectedRoute><AddUser /></ProtectedRoute>} />
          <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Fallback Guard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
