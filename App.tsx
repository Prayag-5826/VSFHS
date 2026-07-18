import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import FollowUps from './pages/FollowUps'; // Imported the new Marketing Agenda page

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
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
          <Route path="/follow-ups" element={<ProtectedRoute><FollowUps /></ProtectedRoute>} /> {/* Added dynamic agenda routing */}
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

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
