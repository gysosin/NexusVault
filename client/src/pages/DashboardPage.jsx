import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from '../components/Dashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSession } from '../context/SessionContext';
import * as connectionApi from '../api/connections';

export const DashboardPage = ({ setView }) => {
    const { sessions, createSession } = useSession();
    const [connections, setConnections] = useState([]);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState(null);
    const [connectionPassword, setConnectionPassword] = useState('');

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
        if (connection.password || connection.hasPassword) {
            createSession(connection);
            setView('terminal');
        } else {
            setPendingConnection(connection);
            setConnectionPassword('');
            setPasswordDialogOpen(true);
        }
    };

    const confirmConnection = (e) => {
        e.preventDefault();
        if (pendingConnection) {
            createSession({
                ...pendingConnection,
                password: connectionPassword,
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
                        <DialogTitle>Enter Password</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={confirmConnection}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Connect to {pendingConnection?.username}@{pendingConnection?.host}</Label>
                                <Input
                                    type="password"
                                    value={connectionPassword}
                                    onChange={(e) => setConnectionPassword(e.target.value)}
                                    placeholder="SSH Password"
                                    className="bg-white/5 border-white/10"
                                    autoFocus
                                />
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
