import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, Activity, Clock, Monitor } from 'lucide-react';
const SessionTerminal = lazy(() => import('./SessionTerminal').then((module) => ({ default: module.SessionTerminal })));
const SessionRDP = lazy(() => import('./SessionRDP'));

const PreviewFallback = () => (
    <div className="h-full w-full bg-[#05070e] flex items-center justify-center text-xs text-gray-500">
        Loading preview...
    </div>
);

export function SessionsDashboard({ sessions, onSwitchSession, previewMode = 'hover' }) {
    // Group sessions by connection (User@Host)
    const groupedSessions = useMemo(() => {
        const groups = {};
        sessions.forEach(session => {
            const key = `${session.username}@${session.host}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    username: session.username,
                    host: session.host,
                    sessions: []
                };
            }
            groups[key].sessions.push(session);
        });
        return Object.values(groups);
    }, [sessions]);

    return (
        <div className="h-full p-6 animate-in fade-in duration-500 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Active Sessions</h1>
                    <p className="text-muted-foreground">Monitor and manage your running remote sessions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 px-3 py-1">
                        <Activity className="w-3 h-3 mr-2" />
                        {sessions.length} Active
                    </Badge>
                </div>
            </div>

            {groupedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-500 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                    <Terminal className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No active sessions</p>
                    <p className="text-sm opacity-70">Connect to a host to see it here.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedSessions.map((group) => (
                        <div key={group.id} className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                                <Monitor className="w-5 h-5 text-blue-400" />
                                <h2 className="text-xl font-semibold text-gray-200">
                                    {group.username}@{group.host}
                                </h2>
                                <Badge variant="secondary" className="bg-white/10 text-gray-400">
                                    {group.sessions.length} {group.sessions.length === 1 ? 'Terminal' : 'Terminals'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {group.sessions.map((session) => (
                                    <SessionCard
                                        key={session.id}
                                        session={session}
                                        onClick={() => onSwitchSession(session.id)}
                                        previewMode={previewMode}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SessionCard({ session, onClick, previewMode }) {
    const [isHovered, setIsHovered] = useState(false);

    // Determine if we should show the live terminal
    // If mode is 'always', show it.
    // If mode is 'hover', show it only when hovered.
    const showLivePreview = previewMode === 'always' || (previewMode === 'hover' && isHovered);

    return (
        <Card
            className="group overflow-hidden border-white/10 bg-[#0d1117]/60 backdrop-blur-md hover:bg-[#0d1117]/80 hover:border-blue-500/30 transition-all duration-300 cursor-pointer h-[280px] flex flex-col"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <CardHeader className="p-4 pb-2 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${(session.status === 'Connected' || session.status === 'Session resumed.' || session.status === 'Connected to host.') ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <CardTitle className="text-sm font-mono truncate text-gray-300">
                        {`Session #${(session.serverId || session.id || '').slice(-4) || '----'}`}
                    </CardTitle>
                </div>
                <div className="flex items-center text-xs text-gray-500 font-mono">
                    <Clock className="w-3 h-3 mr-1" />
                    {/* Placeholder for duration */}
                    <span>Active</span>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 relative bg-black/50">
                {/* Terminal Preview Area */}
                <div className="absolute inset-0 overflow-hidden">
                    {showLivePreview ? (
                        <div className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none select-none">
                            <Suspense fallback={<PreviewFallback />}>
                                {session.protocol === 'rdp' ? (
                                    <SessionRDP
                                        session={session}
                                        onClose={() => { }}
                                        onFocus={() => { }}
                                        onSessionMetadata={() => { }}
                                    />
                                ) : (
                                    <SessionTerminal
                                        session={session}
                                        isActive={true}
                                        terminalViewVisible={true}
                                        isPreview={true}
                                    />
                                )}
                            </Suspense>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
                            <Terminal className="w-12 h-12 opacity-20" />
                            <span className="text-xs uppercase tracking-widest opacity-50">Hover to Preview</span>
                        </div>
                    )}
                </div>

                {/* Overlay for clickability and hover effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                    <span className="text-blue-400 text-sm font-medium bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 backdrop-blur-sm">
                        Open Terminal
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
