import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Terminal, Trash2, Search, Server, Activity, Database, KeyRound, MonitorDot, RefreshCw, Wifi, WifiOff, CircleDashed, History, Star } from 'lucide-react';
import { AddConnectionDialog } from '../dialogs/AddConnectionDialog';
import { Badge } from '@/components/ui/badge';
import { buildDashboardAnalytics } from '@/lib/dashboardAnalytics';

const analyticsIcons = {
    totalConnections: Database,
    activeSessions: Activity,
    protocolMix: MonitorDot,
    credentialCoverage: KeyRound,
};

const healthStatusConfig = {
    reachable: {
        label: 'Reachable',
        detailClassName: 'text-green-300',
        badgeClassName: 'border-green-500/30 bg-green-500/10 text-green-300',
        Icon: Wifi,
    },
    unreachable: {
        label: 'Unreachable',
        detailClassName: 'text-amber-300',
        badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        Icon: WifiOff,
    },
    error: {
        label: 'Check failed',
        detailClassName: 'text-amber-300',
        badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        Icon: WifiOff,
    },
    checking: {
        label: 'Checking',
        detailClassName: 'text-sky-300',
        badgeClassName: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
        Icon: RefreshCw,
    },
    unknown: {
        label: 'Not checked',
        detailClassName: 'text-gray-400',
        badgeClassName: 'border-white/10 bg-white/[0.04] text-gray-400',
        Icon: CircleDashed,
    },
};

const getHealthStatus = (health) => {
    if (!health?.status || !healthStatusConfig[health.status]) {
        return 'unknown';
    }
    return health.status;
};

export function Dashboard({
    connections,
    onConnect,
    onDelete,
    onAdd,
    sessions = [],
    isLoading = false,
    error = null,
    connectionHealth = {},
    onCheckHealth,
    onFavorite,
    recentSessions = [],
    isLoadingRecentSessions = false,
    recentSessionsError = null,
    onRefreshRecentSessions,
}) {
    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);

    const analytics = useMemo(
        () => buildDashboardAnalytics({ connections, sessions }),
        [connections, sessions]
    );

    const healthSummary = useMemo(
        () => buildHealthSummary(connections, connectionHealth),
        [connections, connectionHealth]
    );
    const favoriteConnections = useMemo(
        () => connections.filter((connection) => connection.isFavorite),
        [connections]
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

            <FavoriteConnectionsRail
                favorites={favoriteConnections}
                isLoading={isLoading}
                onConnect={onConnect}
                onFavorite={onFavorite}
            />

            <ConnectionHealthSnapshot summary={healthSummary} isLoading={isLoading} />

            <RecentSessionTimeline
                sessions={recentSessions}
                isLoading={isLoadingRecentSessions}
                error={recentSessionsError}
                onRefresh={onRefreshRecentSessions}
            />

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
                        health={connectionHealth[conn.id]}
                        onConnect={onConnect}
                        onDelete={onDelete}
                        onFavorite={onFavorite}
                        onCheckHealth={onCheckHealth}
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

function buildHealthSummary(connections, connectionHealth) {
    return connections.reduce((summary, connection) => {
        const status = getHealthStatus(connectionHealth[connection.id]);
        summary[status] += 1;
        return summary;
    }, {
        reachable: 0,
        unreachable: 0,
        error: 0,
        checking: 0,
        unknown: 0,
        total: connections.length,
    });
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

function ConnectionHealthSnapshot({ summary, isLoading }) {
    const notReadyCount = summary.unreachable + summary.error;

    return (
        <Card className="border-white/10 bg-[#0b1220]/60">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Connection health snapshot</p>
                    <p className="mt-1 text-sm text-gray-400">
                        Check saved SSH/RDP targets before opening a terminal session.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <HealthSummaryPill label="Ready" value={summary.reachable} tone="text-green-300" isLoading={isLoading} />
                    <HealthSummaryPill label="Needs review" value={notReadyCount} tone="text-amber-300" isLoading={isLoading} />
                    <HealthSummaryPill label="Checking" value={summary.checking} tone="text-sky-300" isLoading={isLoading} />
                    <HealthSummaryPill label="Not checked" value={summary.unknown} tone="text-gray-300" isLoading={isLoading} />
                </div>
            </CardContent>
        </Card>
    );
}

function HealthSummaryPill({ label, value, tone, isLoading }) {
    return (
        <div className="min-w-28 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            {isLoading ? (
                <div className="mt-2 h-5 w-8 animate-pulse rounded bg-white/10" />
            ) : (
                <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
            )}
        </div>
    );
}

function FavoriteConnectionsRail({ favorites, isLoading, onConnect, onFavorite }) {
    return (
        <Card className="border-white/10 bg-[#0b1220]/60">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Star className="h-4 w-4 text-amber-300" />
                    Favorite connections
                </CardTitle>
                <CardDescription className="text-sm text-gray-400">
                    Pin critical targets here for faster session starts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="h-20 animate-pulse rounded-md border border-white/10 bg-white/[0.03]" />
                        ))}
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-gray-400">
                        No favorites yet. Star a connection card to keep it in this rail.
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {favorites.map((connection) => (
                            <div key={connection.id} className="rounded-md border border-amber-500/20 bg-amber-500/[0.06] p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white">{connection.name}</p>
                                        <p className="mt-1 truncate font-mono text-xs text-amber-100/70">
                                            {connection.username}@{connection.host}:{connection.port}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                                        onClick={() => onFavorite?.(connection.id, false)}
                                        aria-label={`Remove ${connection.name} from favorites`}
                                    >
                                        <Star className="h-4 w-4 fill-current" />
                                    </Button>
                                </div>
                                <Button
                                    className="mt-3 h-8 w-full bg-white/5 text-xs text-gray-200 hover:bg-white/10 hover:text-white"
                                    onClick={() => onConnect(connection)}
                                >
                                    <Terminal className="mr-2 h-3.5 w-3.5" />
                                    Launch
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RecentSessionTimeline({ sessions, isLoading, error, onRefresh }) {
    return (
        <Card className="border-white/10 bg-[#0b1220]/60">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                        <History className="h-4 w-4 text-primary" />
                        Recent session timeline
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-gray-400">
                        Last five terminal sessions across saved SSH/RDP targets.
                    </CardDescription>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-fit border-white/10 bg-white/[0.04] text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                    onClick={onRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                        {error}
                    </div>
                )}
                {!error && isLoading && <RecentSessionSkeleton />}
                {!error && !isLoading && sessions.length === 0 && (
                    <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-gray-400">
                        No recent sessions yet. Launch a connection to start building the timeline.
                    </div>
                )}
                {!error && !isLoading && sessions.length > 0 && (
                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <RecentSessionItem key={session.sessionId || session.session_id || session.id} session={session} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RecentSessionSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="h-4 w-2/5 animate-pulse rounded bg-white/10" />
                    <div className="mt-3 h-3 w-3/5 animate-pulse rounded bg-white/10" />
                </div>
            ))}
        </div>
    );
}

function RecentSessionItem({ session }) {
    const startedAt = session.startTime || session.start_time;
    const endedAt = session.endTime || session.end_time;
    const status = session.status || 'unknown';
    const statusClassName = status === 'active'
        ? 'border-green-500/30 bg-green-500/10 text-green-300'
        : 'border-white/10 bg-white/[0.04] text-gray-300';

    return (
        <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-100">
                    {session.username}@{session.host}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                    {formatSessionTimestamp(startedAt)}
                    {endedAt ? ` - ${formatSessionTimestamp(endedAt)}` : ' - Still active'}
                </p>
            </div>
            <Badge variant="outline" className={`w-fit ${statusClassName}`}>
                {status}
            </Badge>
        </div>
    );
}

function formatSessionTimestamp(value) {
    if (!value) {
        return 'Unknown time';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Unknown time';
    }

    return parsed.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
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

function ConnectionCard({ conn, sessions, health, onConnect, onDelete, onFavorite, onCheckHealth }) {
    const getActiveSessionCount = (connection) => {
        return sessions.filter(s => (
            s.connectionId === connection.id ||
            (s.host === connection.host && s.username === connection.username)
        )).length;
    };

    const activeCount = getActiveSessionCount(conn);
    const isConnected = activeCount > 0;
    const healthStatus = getHealthStatus(health);
    const healthConfig = healthStatusConfig[healthStatus];
    const HealthIcon = healthConfig.Icon;
    const checkedAt = health?.checkedAt
        ? new Date(health.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <Card className="group hover:shadow-xl transition-all duration-300 border-white/10 bg-[#0d1117]/60 backdrop-blur-md hover:bg-[#0d1117]/80">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${isConnected ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
                        <Server className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 hover:bg-amber-500/10 ${conn.isFavorite ? 'text-amber-300 hover:text-amber-200' : 'text-muted-foreground hover:text-amber-200'}`}
                            onClick={() => onFavorite?.(conn.id, !conn.isFavorite)}
                            aria-label={conn.isFavorite ? `Remove ${conn.name} from favorites` : `Add ${conn.name} to favorites`}
                        >
                            <Star className={`h-4 w-4 ${conn.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
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
            <CardContent className="space-y-3 py-0">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={healthConfig.badgeClassName}>
                                <HealthIcon className={`mr-1 h-3 w-3 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
                                {healthConfig.label}
                            </Badge>
                        </div>
                        <p className={`mt-1 text-xs ${healthConfig.detailClassName}`}>
                            {health?.error || (checkedAt ? `Checked ${checkedAt}` : 'No reachability check yet')}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-white/10 bg-white/[0.04] text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                        disabled={healthStatus === 'checking'}
                        onClick={() => onCheckHealth?.(conn.id)}
                    >
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
                        Check
                    </Button>
                </div>
            </CardContent>
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
