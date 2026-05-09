import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from '../components/dashboard/Dashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '../context/SessionContext';
import * as connectionApi from '../api/connections';
import * as sessionApi from '../api/sessions';
import * as securityApi from '../api/security';
import * as systemApi from '../api/system';

export const DashboardPage = ({ setView }) => {
    const { sessions, createSession } = useSession();
    const [connections, setConnections] = useState([]);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState(null);
    const [connectionPassword, setConnectionPassword] = useState('');
    const [restoreHistory, setRestoreHistory] = useState(false);
    const [isLoadingConnections, setIsLoadingConnections] = useState(true);
    const [connectionError, setConnectionError] = useState(null);
    const [connectionHealth, setConnectionHealth] = useState({});
    const [recentSessions, setRecentSessions] = useState([]);
    const [isLoadingRecentSessions, setIsLoadingRecentSessions] = useState(true);
    const [recentSessionsError, setRecentSessionsError] = useState(null);
    const [failedLoginTrend, setFailedLoginTrend] = useState([]);
    const [isLoadingFailedLoginTrend, setIsLoadingFailedLoginTrend] = useState(true);
    const [failedLoginTrendError, setFailedLoginTrendError] = useState(null);
    const [maintenanceBanner, setMaintenanceBanner] = useState(null);
    const [isLoadingMaintenanceBanner, setIsLoadingMaintenanceBanner] = useState(true);
    const [maintenanceBannerError, setMaintenanceBannerError] = useState(null);

    const fetchConnections = useCallback(async () => {
        setIsLoadingConnections(true);
        setConnectionError(null);
        try {
            const data = await connectionApi.getConnections();
            setConnections(data);
        } catch (err) {
            console.error('Failed to fetch connections', err);
            setConnectionError(err.message || 'Failed to load connections.');
        } finally {
            setIsLoadingConnections(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const fetchRecentSessions = useCallback(async () => {
        setIsLoadingRecentSessions(true);
        setRecentSessionsError(null);
        try {
            const data = await sessionApi.getSessionHistory(null, { limit: 5 });
            setRecentSessions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch recent sessions', err);
            setRecentSessionsError(err.message || 'Failed to load recent sessions.');
        } finally {
            setIsLoadingRecentSessions(false);
        }
    }, []);

    useEffect(() => {
        fetchRecentSessions();
    }, [fetchRecentSessions]);

    const fetchFailedLoginTrend = useCallback(async () => {
        setIsLoadingFailedLoginTrend(true);
        setFailedLoginTrendError(null);
        try {
            const data = await securityApi.getFailedLoginTrend();
            setFailedLoginTrend(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch failed login trend', err);
            setFailedLoginTrendError(err.message || 'Failed to load failed login trend.');
        } finally {
            setIsLoadingFailedLoginTrend(false);
        }
    }, []);

    useEffect(() => {
        fetchFailedLoginTrend();
    }, [fetchFailedLoginTrend]);

    const fetchMaintenanceBanner = useCallback(async () => {
        setIsLoadingMaintenanceBanner(true);
        setMaintenanceBannerError(null);
        try {
            const data = await systemApi.getMaintenanceBanner();
            setMaintenanceBanner(data);
        } catch (err) {
            console.error('Failed to fetch maintenance banner', err);
            setMaintenanceBannerError(err.message || 'Failed to load maintenance banner.');
        } finally {
            setIsLoadingMaintenanceBanner(false);
        }
    }, []);

    useEffect(() => {
        fetchMaintenanceBanner();
    }, [fetchMaintenanceBanner]);

    const handleAddConnection = async (newConnection) => {
        try {
            const data = await connectionApi.createConnection(newConnection);
            setConnections((prev) => [...prev, data]);
            setConnectionError(null);
        } catch (err) {
            console.error('Failed to add connection', err);
            setConnectionError(err.message || 'Failed to add connection.');
        }
    };

    const handleDeleteConnection = async (id) => {
        try {
            await connectionApi.deleteConnection(id);
            setConnections((prev) => prev.filter((conn) => conn.id !== id));
            setConnectionHealth((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            setConnectionError(null);
        } catch (err) {
            console.error('Failed to delete connection', err);
            setConnectionError(err.message || 'Failed to delete connection.');
        }
    };

    const handleCheckConnectionHealth = async (id) => {
        setConnectionHealth((prev) => ({
            ...prev,
            [id]: { status: 'checking', checkedAt: new Date().toISOString() },
        }));

        try {
            const result = await connectionApi.checkConnectionHealth(id);
            setConnectionHealth((prev) => ({
                ...prev,
                [id]: result,
            }));
        } catch (err) {
            setConnectionHealth((prev) => ({
                ...prev,
                [id]: {
                    status: 'error',
                    checkedAt: new Date().toISOString(),
                    error: err.message || 'Failed to check connection health.',
                },
            }));
        }
    };

    const handleFavoriteConnection = async (id, isFavorite) => {
        try {
            const updated = await connectionApi.setConnectionFavorite(id, isFavorite);
            setConnections((prev) => prev.map((conn) => (
                conn.id === id ? { ...conn, isFavorite: updated.isFavorite } : conn
            )));
            setConnectionError(null);
        } catch (err) {
            console.error('Failed to update favorite connection', err);
            setConnectionError(err.message || 'Failed to update favorite connection.');
        }
    };

    const initiateConnection = (connection) => {
        setPendingConnection(connection);
        setConnectionPassword('');
        setRestoreHistory(false);
        setPasswordDialogOpen(true);
    };

    const confirmConnection = (e) => {
        e.preventDefault();
        if (pendingConnection) {
            createSession({
                ...pendingConnection,
                password: connectionPassword,
                restoreHistory: restoreHistory,
            });
            setPasswordDialogOpen(false);
            setView('terminal');
        }
    };

    return (
        <>
            <Dashboard
                connections={connections}
                onAdd={handleAddConnection}
                onConnect={initiateConnection}
                onDelete={handleDeleteConnection}
                sessions={sessions}
                isLoading={isLoadingConnections}
                error={connectionError}
                connectionHealth={connectionHealth}
                onCheckHealth={handleCheckConnectionHealth}
                onFavorite={handleFavoriteConnection}
                recentSessions={recentSessions}
                isLoadingRecentSessions={isLoadingRecentSessions}
                recentSessionsError={recentSessionsError}
                onRefreshRecentSessions={fetchRecentSessions}
                failedLoginTrend={failedLoginTrend}
                isLoadingFailedLoginTrend={isLoadingFailedLoginTrend}
                failedLoginTrendError={failedLoginTrendError}
                onRefreshFailedLoginTrend={fetchFailedLoginTrend}
                maintenanceBanner={maintenanceBanner}
                isLoadingMaintenanceBanner={isLoadingMaintenanceBanner}
                maintenanceBannerError={maintenanceBannerError}
                activeSession={null}
            />

            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent className="bg-brand-surface border-brand-border text-white">
                    <DialogHeader>
                        <DialogTitle>Connection Options</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={confirmConnection}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Connect to {pendingConnection?.username}@{pendingConnection?.host}</Label>
                                {(!pendingConnection?.password && !pendingConnection?.hasPassword) && (
                                    <Input
                                        type="password"
                                        value={connectionPassword}
                                        onChange={(e) => setConnectionPassword(e.target.value)}
                                        placeholder="SSH Password"
                                        className="bg-white/5 border-white/10"
                                        autoFocus
                                    />
                                )}
                                {pendingConnection?.type !== 'rdp' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Checkbox
                                            id="restoreHistory"
                                            checked={restoreHistory}
                                            onCheckedChange={setRestoreHistory}
                                            className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                        />
                                        <label
                                            htmlFor="restoreHistory"
                                            className="text-sm font-medium leading-none text-gray-300 cursor-pointer select-none"
                                        >
                                            Restore previous session history
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                                Connect
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};
