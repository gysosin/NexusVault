import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import SessionSidebar from '../components/SessionSidebar';

export const MainLayout = ({ children, view, setView }) => {
    const { user, logout } = useAuth();
    const { sessions, activeSessionId, setActiveSessionId, closeSession } = useSession();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#192036,#090c14_70%)] px-4 py-6 flex flex-col">
            <Navbar
                connected={sessions.length > 0}
                user={user}
                onLogout={logout}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSwitchSession={(id) => {
                    setActiveSessionId(id);
                    setView('terminal');
                }}
                setView={setView}
            />

            <div className="flex gap-6 flex-1">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    view={view}
                    setView={setView}
                    user={user}
                />

                <main className="flex-1 bg-background/95 relative rounded-lg border border-white/10 shadow-xl flex flex-col overflow-x-hidden">
                    {children}
                </main>

                {sessions.length > 0 && (
                    <SessionSidebar
                        sessions={sessions}
                        activeSessionId={activeSessionId}
                        onSwitchSession={(id) => {
                            setActiveSessionId(id);
                            setView('terminal');
                        }}
                        onCloseSession={closeSession}
                        onNewSession={() => setView('dashboard')}
                    />
                )}
            </div>
        </div>
    );
};
