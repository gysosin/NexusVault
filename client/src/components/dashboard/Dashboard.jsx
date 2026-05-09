import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Terminal, Trash2, Search, Server, Activity, Database, KeyRound, MonitorDot } from 'lucide-react';
import { AddConnectionDialog } from '../dialogs/AddConnectionDialog';
import { Badge } from '@/components/ui/badge';
import { buildDashboardAnalytics } from '@/lib/dashboardAnalytics';

const analyticsIcons = {
    totalConnections: Database,
    activeSessions: Activity,
    protocolMix: MonitorDot,
    credentialCoverage: KeyRound,
};

export function Dashboard({ connections, onConnect, onDelete, onAdd, sessions = [], isLoading = false, error = null }) {
    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);

    const analytics = useMemo(
        () => buildDashboardAnalytics({ connections, sessions }),
        [connections, sessions]
    );

    const filtered = connections.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.host.toLowerCase().includes(search.toLowerCase())
    );



    return (
        <div className="h-full flex flex-col p-6 space-y-6 animate-in fade-in duration-500 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Monitor your access surface and launch secure remote sessions.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> New Connection
                </Button>
            </div>

            <DashboardAnalytics analytics={analytics} isLoading={isLoading} />

            {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {error}
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search connections..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 max-w-md bg-card/50 backdrop-blur-sm border-white/10 focus:border-primary/50"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-10">
                {isLoading && connections.length === 0 && (
                    <ConnectionGridSkeleton />
                )}
                {!isLoading && filtered.map((conn) => (
                    <ConnectionCard
                        key={conn.id}
                        conn={conn}
                        sessions={sessions}
                        onConnect={onConnect}
                        onDelete={onDelete}
                    />
                ))}
                {!isLoading && filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed border-white/10 rounded-lg bg-white/5">
                        No connections found. Create one to get started.
                    </div>
                )}
            </div>

            <AddConnectionDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                onAdd={onAdd}
            />
        </div >
    );
}

function DashboardAnalytics({ analytics, isLoading }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(analytics).map(([key, card]) => {
                const Icon = analyticsIcons[key];
                return (
                    <Card key={key} className="border-white/10 bg-[#0b1220]/70 shadow-lg shadow-black/10">
                        <CardContent className="flex h-full items-center justify-between gap-4 p-5">
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase text-gray-500">{card.label}</p>
                                <div className="mt-3 min-h-9">
                                    {isLoading ? (
                                        <div className="h-8 w-20 animate-pulse rounded bg-white/10" />
                                    ) : (
                                        <p className="text-3xl font-semibold text-white">{card.value}</p>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-gray-400">{isLoading ? 'Loading live data' : card.detail}</p>
                            </div>
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-primary">
                                <Icon className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function ConnectionGridSkeleton() {
    return Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-white/10 bg-[#0d1117]/60">
            <CardHeader className="space-y-4 pb-3">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-white/10" />
                <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
            </CardHeader>
            <CardFooter>
                <div className="h-10 w-full animate-pulse rounded bg-white/10" />
            </CardFooter>
        </Card>
    ));
}

function ConnectionCard({ conn, sessions, onConnect, onDelete }) {
    const getActiveSessionCount = (connection) => {
        return sessions.filter(s => (
            s.connectionId === connection.id ||
            (s.host === connection.host && s.username === connection.username)
        )).length;
    };

    const activeCount = getActiveSessionCount(conn);
    const isConnected = activeCount > 0;

    return (
        <Card className="group hover:shadow-xl transition-all duration-300 border-white/10 bg-[#0d1117]/60 backdrop-blur-md hover:bg-[#0d1117]/80">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
                        <Server className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1">
                        {isConnected && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 mr-2">
                                <Activity className="w-3 h-3 mr-1" />
                                Connected
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-500/10"
                            onClick={() => onDelete(conn.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <CardTitle className="mt-3 text-xl text-gray-100">{conn.name}</CardTitle>
                <CardDescription className="font-mono text-xs truncate text-gray-500">
                    {conn.username}@{conn.host}:{conn.port}
                </CardDescription>
            </CardHeader>
            <CardFooter>
                <Button
                    className={`w-full transition-all ${isConnected
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                        }`}
                    onClick={() => onConnect(conn)}
                >
                    <Terminal className="mr-2 h-4 w-4" />
                    {isConnected ? 'New Session' : 'Connect'}
                </Button>
            </CardFooter>
        </Card>
    );
}
