import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Power } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function SessionManagement() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/admin/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        } finally {
            setLoading(false);
        }
    };

    const confirmTerminate = (session) => {
        setSelectedSession(session);
        setIsDialogOpen(true);
    };

    const handleTerminateSession = async () => {
        if (!selectedSession) return;
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/admin/sessions/${selectedSession.ID}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchSessions();
                setIsDialogOpen(false);
                setSelectedSession(null);
            }
        } catch (err) {
            console.error('Failed to terminate session', err);
        }
    };

    if (loading) return <div className="text-white p-4">Loading sessions...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
            </div>

            <div className="rounded-md border border-white/10 bg-black/20">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-gray-400">User</TableHead>
                            <TableHead className="text-gray-400">Host</TableHead>
                            <TableHead className="text-gray-400">Type</TableHead>
                            <TableHead className="text-gray-400">Started At</TableHead>
                            <TableHead className="text-right text-gray-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sessions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                    No active sessions found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sessions.map((session) => (
                                <TableRow key={session.ID} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium text-white">{session.Username}</TableCell>
                                    <TableCell className="text-gray-300">{session.Host}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                            {session.Type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-400">
                                        {new Date(session.CreatedAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => confirmTerminate(session)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Power className="h-4 w-4 mr-2" />
                                            Terminate
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Terminate Session</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Are you sure you want to terminate the session for
                            <span className="font-semibold text-white mx-1">
                                {selectedSession?.Username}
                            </span>
                            on
                            <span className="font-semibold text-white mx-1">
                                {selectedSession?.Host}
                            </span>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="border-white/10 hover:bg-white/5 hover:text-white text-gray-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleTerminateSession}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
                        >
                            Terminate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
