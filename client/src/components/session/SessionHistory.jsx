import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Clock, Terminal, Calendar } from 'lucide-react';
import { getSessionDetails, getSessionHistory } from '@/api/sessions';

export function SessionHistory({ connectionId, open, onOpenChange }) {
    const [history, setHistory] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [logContent, setLogContent] = useState('');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSessionHistory(connectionId);
            setHistory(data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    }, [connectionId]);

    useEffect(() => {
        if (open && connectionId) {
            fetchHistory();
        }
    }, [open, connectionId, fetchHistory]);

    const fetchSessionLog = async (sessionId) => {
        try {
            const data = await getSessionDetails(sessionId);
            setLogContent(data.log_content || 'No logs available.');
            setSelectedSession(sessionId);
        } catch (error) {
            console.error('Failed to fetch session log:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) setSelectedSession(null);
            onOpenChange(val);
        }}>
            <DialogContent className="bg-[#0d1117] border-white/10 text-gray-200 max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b border-white/10">
                    <DialogTitle>Connection History</DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* List */}
                    <div className={`w-1/3 border-r border-white/10 flex flex-col ${selectedSession ? 'hidden md:flex' : 'flex'}`}>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {loading ? (
                                    <div className="p-4 text-center text-gray-500">Loading...</div>
                                ) : history.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">No history found.</div>
                                ) : (
                                    history.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => fetchSessionLog(item.session_id)}
                                            className={`w-full text-left p-3 rounded-md text-sm transition-colors ${selectedSession === item.session_id
                                                    ? 'bg-blue-500/20 text-blue-200'
                                                    : 'hover:bg-white/5 text-gray-400'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-gray-200">{new Date(item.start_time).toLocaleDateString()}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs opacity-70">
                                                <Clock className="w-3 h-3" />
                                                {new Date(item.start_time).toLocaleTimeString()}
                                                {item.end_time && ` - ${new Date(item.end_time).toLocaleTimeString()}`}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 flex flex-col bg-[#05070e] ${!selectedSession ? 'hidden md:flex' : 'flex'}`}>
                        {selectedSession ? (
                            <>
                                <div className="h-10 border-b border-white/10 flex items-center px-4 justify-between bg-[#0d1117]">
                                    <span className="text-sm font-mono text-gray-400">Session Log</span>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)} className="md:hidden">
                                        Back
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1 p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap">
                                    {logContent}
                                </ScrollArea>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-2">
                                <Terminal className="w-8 h-8 opacity-50" />
                                <span className="text-sm">Select a session to view logs</span>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
