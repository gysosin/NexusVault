import { Suspense, lazy, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TerminalPage } from './pages/TerminalPage';
import { Toaster } from './components/ui/toaster';
import { loadUserSettings, persistUserSettings } from './lib/userSettings';
import { loadCurrentView, persistCurrentView } from './lib/viewStorage';

const SessionsDashboard = lazy(() => import('./components/session/SessionsDashboard').then((module) => ({ default: module.SessionsDashboard })));
const Settings = lazy(() => import('./components/settings/Settings').then((module) => ({ default: module.Settings })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then((module) => ({ default: module.AdminPanel })));
const PlanPage = lazy(() => import('./pages/PlanPage').then((module) => ({ default: module.PlanPage })));
const StatusPage = lazy(() => import('./pages/StatusPage').then((module) => ({ default: module.StatusPage })));

const ViewFallback = () => (
  <div className="min-h-[320px] rounded-lg border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
    Loading view...
  </div>
);

const AppContent = () => {
  const { user, loading } = useAuth();
  const { sessions, setActiveSessionId } = useSession();
  const [view, setView] = useState(loadCurrentView);

  const [userSettings, setUserSettings] = useState(loadUserSettings);

  useEffect(() => {
    persistCurrentView(view);
  }, [view]);

  const handleSaveSettings = (newSettings) => {
    setUserSettings(newSettings);
    persistUserSettings(newSettings);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#090c14] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MainLayout view={view} setView={setView}>
      <Suspense fallback={<ViewFallback />}>
        {view === 'dashboard' && <DashboardPage setView={setView} />}

        {view === 'sessions_dashboard' && (
          <SessionsDashboard
            sessions={sessions}
            onSwitchSession={(id) => {
              setActiveSessionId(id);
              setView('terminal');
            }}
            previewMode={userSettings.sessionPreviewMode}
          />
        )}

        {view === 'settings' && (
          <Settings settings={userSettings} onSave={handleSaveSettings} />
        )}

        {view === 'admin' && <AdminPanel />}

        {view === 'plan' && <PlanPage />}

        {view === 'status' && <StatusPage />}
      </Suspense>

      <TerminalPage visible={view === 'terminal'} setView={setView} />
    </MainLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppContent />
        <Toaster />
      </SessionProvider>
    </AuthProvider>
  );
}

export default App;
