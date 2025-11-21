import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TerminalPage } from './pages/TerminalPage';
import { SessionsDashboard } from './components/session/SessionsDashboard';
import { PlanPage } from './pages/PlanPage';
import { StatusPage } from './pages/StatusPage';
import { Settings } from './components/settings/Settings';
import { AdminPanel } from './components/admin/AdminPanel';

const AppContent = () => {
  const { user, loading } = useAuth();
  const { sessions, setActiveSessionId } = useSession();
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('current_view');
      return saved === 'terminal' ? 'terminal' : 'dashboard';
    }
    return 'dashboard';
  });

  // User Settings (moved from original App.jsx, could be in a context but keeping simple for now)
  const [userSettings, setUserSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('user_settings');
      return saved ? JSON.parse(saved) : { sessionPreviewMode: 'hover' };
    }
    return { sessionPreviewMode: 'hover' };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('current_view', view);
    }
  }, [view]);

  const handleSaveSettings = (newSettings) => {
    setUserSettings(newSettings);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('user_settings', JSON.stringify(newSettings));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#090c14] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MainLayout view={view} setView={setView}>
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

      <TerminalPage visible={view === 'terminal'} setView={setView} />
    </MainLayout>
  );
};

import { Toaster } from './components/ui/toaster';

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
