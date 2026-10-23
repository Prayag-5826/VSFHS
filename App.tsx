import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SplashScreen } from '@capacitor/splash-screen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastContext';
import { AppShell } from './components/AppShell';
import { AnimatedSplash } from './components/AnimatedSplash';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Role } from './types';

// Authentication pages
import Login from './pages/Login';
const AdminLogin = lazy(() => import('./pages/AdminLogin'));

// Operational pages are loaded on demand, so the first screen opens faster on a phone.
// (Login stays eager because it is the first thing most people see.)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddVisit = lazy(() => import('./pages/AddVisit'));
const VisitsList = lazy(() => import('./pages/VisitsList'));
const VisitDetails = lazy(() => import('./pages/VisitDetails'));
const Reports = lazy(() => import('./pages/Reports'));
const AddUser = lazy(() => import('./pages/AddUser'));
const Settings = lazy(() => import('./pages/Settings'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const DocumentsDesk = lazy(() => import('./pages/DocumentsDesk'));
const CreateQuotation = lazy(() => import('./pages/CreateQuotation').then((m) => ({ default: m.CreateQuotation })));

// Site Inspection & Photographic Audit Pages
const SiteAudit = lazy(() => import('./pages/SiteAuditPage'));
const InspectionGallery = lazy(() => import('./pages/InspectionGalleryPage'));

// Native services
import { startOfflineSync } from './services/offlineSync';
import { requestAppPermissions } from './services/permissions';

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-8 h-8 border-4 border-red-700/20 border-t-red-700 rounded-full animate-spin" />
  </div>
);

/**
 * One layout route for every signed-in page. The sidebar stays mounted while the
 * officer moves between pages (before, each route created its own copy).
 */
const ProtectedLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
};

/** Restricts a group of routes to certain roles. Mirrors the links shown in the sidebar. */
const RoleGate: React.FC<{ roles: Role[] }> = ({ roles }) => {
  const { user } = useAuth();
  if (!roles.includes(user?.role as Role)) return <Navigate to="/" replace />;
  return <Outlet />;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 1. Hide the native Android splash window
    SplashScreen.hide().catch(() => {});

    // 2. Ask for native permissions (camera, GPS, notifications)
    requestAppPermissions();

    // 3. Upload visits saved while offline (one listener, one run at a time)
    return startOfflineSync();
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}

          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public portals */}
                <Route path="/login" element={<Login />} />
                <Route path="/vsfhs-master-portal" element={<AdminLogin />} />

                {/* Everything below needs a signed-in user */}
                <Route element={<ProtectedLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/add-visit" element={<AddVisit />} />
                  <Route path="/visits" element={<VisitsList />} />
                  <Route path="/visit/:id" element={<VisitDetails />} />
                  <Route path="/follow-ups" element={<FollowUps />} />
                  <Route path="/create-quotation" element={<CreateQuotation />} />

                  {/* Accessible to ALL authenticated field staff & admin */}
                  <Route path="/site-audit" element={<SiteAudit />} />

                  {/* Admin and senior executives only */}
                  <Route element={<RoleGate roles={[Role.ADMIN, Role.SR_FIELD_EXECUTIVE]} />}>
                    <Route path="/add-user" element={<AddUser />} />
                    <Route path="/inspection-gallery" element={<InspectionGallery />} />
                  </Route>

                  {/* Admin only */}
                  <Route element={<RoleGate roles={[Role.ADMIN]} />}>
                    <Route path="/manage-users" element={<ManageUsers />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/documents" element={<DocumentsDesk />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
