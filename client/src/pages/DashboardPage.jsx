import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from '../components/dashboard/Dashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '../context/SessionContext';
import * as connectionApi from '../api/connections';

export const DashboardPage = ({ setView }) => {
    const { sessions, createSession } = useSession();
    const [connections, setConnections] = useState([]);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState(null);
    const [connectionPassword, setConnectionPassword] = useState('');
    const [restoreHistory, setRestoreHistory] = useState(false);

    const fetchConnections = useCallback(async () => {
        try {
            const data = await connectionApi.getConnections();
            setConnections(data);
        } catch (err) {
            console.error('Failed to fetch connections', err);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const handleAddConnection = async (newConnection) => {
        try {
            const data = await connectionApi.createConnection(newConnection);
            setConnections((prev) => [...prev, data]);
        } catch (err) {
            console.error('Failed to add connection', err);
        }
    };

    const handleDeleteConnection = async (id) => {
        try {
            await connectionApi.deleteConnection(id);
            setConnections((prev) => prev.filter((conn) => conn.id !== id));
        } catch (err) {
            console.error('Failed to delete connection', err);
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
