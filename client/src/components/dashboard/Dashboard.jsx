import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Terminal, Trash2, Search, Server, Activity, Database, KeyRound, MonitorDot, RefreshCw, Wifi, WifiOff, CircleDashed, History, Star, ShieldAlert, Command, ArrowRight, ShieldX, Megaphone, Bookmark, Download, Copy, Check, CheckCircle2, Circle } from 'lucide-react';
import { AddConnectionDialog } from '../dialogs/AddConnectionDialog';
import { Badge } from '@/components/ui/badge';
import { buildDashboardAnalytics } from '@/lib/dashboardAnalytics';
import { buildConnectionRiskSummary } from '@/lib/connectionRisk';
import { getQuickLaunchMatches } from '@/lib/quickLaunch';
import { buildProtocolUtilization } from '@/lib/protocolUtilization';
import {
    filterConnectionsByDashboardView,
    getDashboardView,
    getDashboardViewCards,
    loadDashboardViewId,
    persistDashboardViewId,
} from '@/lib/dashboardViews';
import { downloadConnectionsCsv } from '@/lib/connectionExport';
import { copyConnectionAddress } from '@/lib/connectionAddress';
import { buildDashboardOnboardingSteps, isDashboardOnboardingComplete } from '@/lib/dashboardOnboarding';

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

const maintenanceBannerConfig = {
    info: {
        label: 'Notice',
        className: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
        badgeClassName: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
        iconClassName: 'text-sky-300',
    },
    warning: {
        label: 'Maintenance',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
        badgeClassName: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
        iconClassName: 'text-amber-300',
    },
    critical: {
        label: 'Critical',
        className: 'border-red-500/30 bg-red-500/10 text-red-100',
        badgeClassName: 'border-red-400/30 bg-red-400/10 text-red-200',
        iconClassName: 'text-red-300',
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
    failedLoginTrend = [],
    isLoadingFailedLoginTrend = false,
    failedLoginTrendError = null,
    onRefreshFailedLoginTrend,
    maintenanceBanner = null,
    isLoadingMaintenanceBanner = false,
    maintenanceBannerError = null,
}) {
    const [search, setSearch] = useState('');
    const [quickLaunchQuery, setQuickLaunchQuery] = useState('');
    const [selectedDashboardViewId, setSelectedDashboardViewId] = useState(() => loadDashboardViewId());
    const [copiedConnectionId, setCopiedConnectionId] = useState(null);
    const [copyFailedConnectionId, setCopyFailedConnectionId] = useState(null);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const scopedConnections = useMemo(
        () => filterConnectionsByDashboardView(connections, selectedDashboardViewId),
        [connections, selectedDashboardViewId]
    );

    const dashboardViews = useMemo(
        () => getDashboardViewCards(connections),
        [connections]
    );
    const onboardingSteps = useMemo(
        () => buildDashboardOnboardingSteps({ connections, sessions, connectionHealth }),
        [connections, sessions, connectionHealth]
    );
    const showOnboardingChecklist = !isDashboardOnboardingComplete(onboardingSteps);

    const selectedDashboardView = useMemo(
        () => getDashboardView(selectedDashboardViewId),
        [selectedDashboardViewId]
    );

    const analytics = useMemo(
        () => buildDashboardAnalytics({ connections: scopedConnections, sessions }),
        [scopedConnections, sessions]
    );

    const healthSummary = useMemo(
        () => buildHealthSummary(scopedConnections, connectionHealth),
        [scopedConnections, connectionHealth]
    );
    const favoriteConnections = useMemo(
        () => connections.filter((connection) => connection.isFavorite),
        [connections]
    );
    const riskSummary = useMemo(
        () => buildConnectionRiskSummary(scopedConnections),
        [scopedConnections]
    );
    const quickLaunchMatches = useMemo(
        () => getQuickLaunchMatches(connections, quickLaunchQuery, 5),
        [connections, quickLaunchQuery]
    );
    const protocolUtilization = useMemo(
        () => buildProtocolUtilization(scopedConnections),
        [scopedConnections]
    );

    const filtered = scopedConnections.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.host.toLowerCase().includes(search.toLowerCase())
    );

    const handleDashboardViewSelect = (viewId) => {
        setSelectedDashboardViewId(viewId);
        persistDashboardViewId(viewId);
    };

    const handleExportConnections = () => {
        downloadConnectionsCsv(filtered, selectedDashboardView.label);
    };

    const handleCopyConnectionAddress = async (connection) => {
        setCopyFailedConnectionId(null);
        setCopiedConnectionId(connection.id);
        try {
            await copyConnectionAddress(connection);
            setTimeout(() => {
                setCopiedConnectionId((currentId) => (currentId === connection.id ? null : currentId));
            }, 3000);
        } catch (err) {
            console.error('Failed to copy connection address', err);
            setCopiedConnectionId(null);
            setCopyFailedConnectionId(connection.id);
            setTimeout(() => {
                setCopyFailedConnectionId((currentId) => (currentId === connection.id ? null : currentId));
            }, 3000);
        }
    };


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

            <MaintenanceBannerNotice
                banner={maintenanceBanner}
                isLoading={isLoadingMaintenanceBanner}
                error={maintenanceBannerError}
            />

            <SavedDashboardViews
                views={dashboardViews}
                selectedViewId={selectedDashboardView.id}
                isLoading={isLoading}
                onSelect={handleDashboardViewSelect}
            />

            {showOnboardingChecklist && (
                <DashboardOnboardingChecklist
                    steps={onboardingSteps}
                    isLoading={isLoading}
                    onAdd={() => setIsAddOpen(true)}
                />
            )}

            <DashboardAnalytics analytics={analytics} isLoading={isLoading} />

            <QuickLaunchCommandBox
                query={quickLaunchQuery}
                matches={quickLaunchMatches}
                isLoading={isLoading}
                onQueryChange={setQuickLaunchQuery}
                onConnect={onConnect}
                onAdd={() => setIsAddOpen(true)}
            />

            <FavoriteConnectionsRail
                favorites={favoriteConnections}
                isLoading={isLoading}
                onConnect={onConnect}
                onFavorite={onFavorite}
            />

            <ConnectionHealthSnapshot summary={healthSummary} isLoading={isLoading} />

            <ConnectionRiskSummary summary={riskSummary} isLoading={isLoading} />

            <ProtocolUtilizationChart rows={protocolUtilization} isLoading={isLoading} total={scopedConnections.length} />

            <FailedLoginTrend
                trend={failedLoginTrend}
                isLoading={isLoadingFailedLoginTrend}
                error={failedLoginTrendError}
                onRefresh={onRefreshFailedLoginTrend}
            />

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

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Search ${selectedDashboardView.label.toLowerCase()}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-card/50 backdrop-blur-sm border-white/10 focus:border-primary/50"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={handleExportConnections}
                    disabled={filtered.length === 0}
                    className="w-full border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10 hover:text-white lg:w-auto"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Export view
                </Button>
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
                        onCopyAddress={handleCopyConnectionAddress}
                        isAddressCopied={copiedConnectionId === conn.id}
                        copyAddressFailed={copyFailedConnectionId === conn.id}
                    />
                ))}
                {!isLoading && filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed border-white/10 rounded-lg bg-white/5">
                        No connections match this saved view.
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

function MaintenanceBannerNotice({ banner, isLoading, error }) {
    if (isLoading) {
        return (
            <div className="h-14 animate-pulse rounded-md border border-white/10 bg-white/[0.04]" aria-label="Loading maintenance notice" />
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="alert">
                <Megaphone className="h-4 w-4 shrink-0 text-amber-300" />
                <span>{error}</span>
            </div>
        );
    }

    if (!banner?.enabled || !banner.message) {
        return null;
    }

    const config = maintenanceBannerConfig[banner.severity] || maintenanceBannerConfig.info;

    return (
        <div className={`flex flex-col gap-3 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${config.className}`} role="status" aria-live="polite">
            <div className="flex min-w-0 items-start gap-3">
                <Megaphone className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconClassName}`} />
                <p className="text-sm leading-6">{banner.message}</p>
            </div>
            <Badge variant="outline" className={`w-fit shrink-0 ${config.badgeClassName}`}>
                {config.label}
            </Badge>
        </div>
    );
}

function SavedDashboardViews({ views, selectedViewId, isLoading, onSelect }) {
    return (
        <Card className="border-white/10 bg-[#07111d]/80">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Bookmark className="h-4 w-4 text-primary" />
                    Saved dashboard views
                </CardTitle>
                <CardDescription className="text-sm text-gray-400">
                    Switch the dashboard to the access slice you need right now.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="h-24 animate-pulse rounded-md border border-white/10 bg-white/[0.04]" />
                        ))
                    ) : (
                        views.map((view) => {
                            const isSelected = view.id === selectedViewId;
                            return (
                                <button
                                    key={view.id}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => onSelect(view.id)}
                                    className={`min-h-24 rounded-md border px-4 py-3 text-left transition-colors ${isSelected
                                        ? 'border-primary/50 bg-primary/10 text-white'
                                        : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-primary/30 hover:bg-white/[0.06]'
                                        }`}
                                >
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium">{view.label}</span>
                                        <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-xs font-semibold text-white">
                                            {view.count}
                                        </span>
                                    </span>
                                    <span className="mt-2 block text-xs leading-5 text-gray-500">
                                        {view.description}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function DashboardOnboardingChecklist({ steps, isLoading, onAdd }) {
    const completedCount = steps.filter((step) => step.complete).length;

    return (
        <Card className="border-white/10 bg-[#0b1220]/60">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                        <CheckCircle2 className="h-4 w-4 text-green-300" />
                        Getting started
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-gray-400">
                        {completedCount} of {steps.length} setup steps complete
                    </CardDescription>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-fit border-white/10 bg-white/[0.04] text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                    onClick={onAdd}
                >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add target
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid gap-3 md:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="h-20 animate-pulse rounded-md border border-white/10 bg-white/[0.03]" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                        {steps.map((step) => {
                            const StepIcon = step.complete ? CheckCircle2 : Circle;
                            return (
                                <div
                                    key={step.id}
                                    className={`rounded-md border px-4 py-3 ${step.complete
                                        ? 'border-green-500/20 bg-green-500/[0.06]'
                                        : 'border-white/10 bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <StepIcon className={`mt-0.5 h-4 w-4 shrink-0 ${step.complete ? 'text-green-300' : 'text-gray-500'}`} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white">{step.label}</p>
                                            <p className="mt-1 text-xs leading-5 text-gray-500">{step.description}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
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

function QuickLaunchCommandBox({ query, matches, isLoading, onQueryChange, onConnect, onAdd }) {
    const hasQuery = query.trim().length > 0;

    return (
        <Card className="border-white/10 bg-[#07111d]/80">
            <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                        <div className="relative">
                            <Command className="absolute left-3 top-3 h-4 w-4 text-primary" />
                            <Input
                                value={query}
                                onChange={(event) => onQueryChange(event.target.value)}
                                placeholder="Host, user, protocol, or port"
                                className="h-11 border-white/10 bg-black/20 pl-9 text-sm text-white placeholder:text-gray-500 focus:border-primary/60"
                                aria-label="Quick launch connections"
                            />
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                            {matches.length} {matches.length === 1 ? 'target' : 'targets'} ready
                        </div>
                    </div>

                    <div className="grid w-full gap-2 lg:w-[28rem]">
                        {isLoading ? (
                            Array.from({ length: 2 }).map((_, index) => (
                                <div key={index} className="h-12 animate-pulse rounded-md border border-white/10 bg-white/[0.04]" />
                            ))
                        ) : matches.length === 0 ? (
                            <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-gray-400">
                                <span>{hasQuery ? 'No matching targets' : 'No saved targets'}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-white/10 bg-white/[0.04] text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                                    onClick={onAdd}
                                >
                                    Add target
                                </Button>
                            </div>
                        ) : (
                            matches.map((connection) => (
                                <button
                                    key={connection.id}
                                    type="button"
                                    className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/10"
                                    onClick={() => onConnect(connection)}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-gray-100">{connection.name}</span>
                                        <span className="block truncate font-mono text-xs text-gray-500">
                                            {connection.username}@{connection.host}:{connection.port}
                                        </span>
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2 text-xs uppercase text-gray-500">
                                        {connection.type || 'ssh'}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
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

function ConnectionRiskSummary({ summary, isLoading }) {
    const postureLabel = summary.totalRiskyConnections === 0 ? 'Clear' : 'Review needed';
    const postureClassName = summary.totalRiskyConnections === 0
        ? 'border-green-500/30 bg-green-500/10 text-green-300'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

    return (
        <Card className="border-white/10 bg-[#0b1220]/60">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                        <ShieldAlert className="h-4 w-4 text-amber-300" />
                        Connection risk summary
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-gray-400">
                        Highlights saved targets that need credential or access review.
                    </CardDescription>
                </div>
                <Badge variant="outline" className={`w-fit ${postureClassName}`}>
                    {postureLabel}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <RiskMetric label="Missing credentials" value={summary.missingCredentialCount} isLoading={isLoading} />
                    <RiskMetric label="Privileged usernames" value={summary.privilegedUsernameCount} isLoading={isLoading} />
                    <RiskMetric label="RDP targets" value={summary.rdpConnectionCount} isLoading={isLoading} />
                </div>

                {isLoading ? (
                    <div className="h-16 animate-pulse rounded-md border border-white/10 bg-white/[0.03]" />
                ) : summary.totalConnections === 0 ? (
                    <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-gray-400">
                        Add connections to start risk review.
                    </div>
                ) : summary.topRisks.length === 0 ? (
                    <div className="rounded-md border border-green-500/20 bg-green-500/[0.06] px-4 py-4 text-sm text-green-200">
                        No immediate connection risks detected from saved metadata.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {summary.topRisks.map(({ connection, reasons }) => (
                            <div key={connection.id} className="flex flex-col gap-2 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">{connection.name}</p>
                                    <p className="mt-1 truncate font-mono text-xs text-amber-100/70">
                                        {connection.username}@{connection.host}:{connection.port}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {reasons.map((reason) => (
                                        <Badge key={reason} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                                            {reason}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ProtocolUtilizationChart({ rows, isLoading, total }) {
    return (
        <Card className="border-white/10 bg-[#0b1220]/60">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                    <MonitorDot className="h-4 w-4 text-primary" />
                    Protocol utilization
                </CardTitle>
                <CardDescription className="text-sm text-gray-400">
                    Saved target distribution across remote access protocols.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 2 }).map((_, index) => (
                            <div key={index} className="h-12 animate-pulse rounded-md border border-white/10 bg-white/[0.03]" />
                        ))}
                    </div>
                ) : total === 0 ? (
                    <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-gray-400">
                        Add SSH or RDP targets to populate utilization.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {rows.map((row) => (
                            <div key={row.key}>
                                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-gray-200">
                                        <span className={`h-2.5 w-2.5 rounded-full ${row.colorClassName}`} />
                                        {row.protocol}
                                    </div>
                                    <div className="text-gray-400">
                                        {row.count} targets / {row.percent}%
                                    </div>
                                </div>
                                <div className="h-2 rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full ${row.colorClassName}`}
                                        style={{ width: `${row.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FailedLoginTrend({ trend, isLoading, error, onRefresh }) {
    const maxCount = Math.max(1, ...trend.map((point) => point.count || 0));
    const total = trend.reduce((sum, point) => sum + (point.count || 0), 0);

    return (
        <Card className="border-white/10 bg-[#0b1220]/60">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                        <ShieldX className="h-4 w-4 text-red-300" />
                        Failed login trend
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-gray-400">
                        Seven-day authentication failure volume from audit events.
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
                {!error && isLoading && (
                    <div className="h-28 animate-pulse rounded-md border border-white/10 bg-white/[0.03]" />
                )}
                {!error && !isLoading && trend.length === 0 && (
                    <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-gray-400">
                        No failed login data available yet.
                    </div>
                )}
                {!error && !isLoading && trend.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-end gap-2">
                            {trend.map((point) => (
                                <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                    <div className="flex h-24 w-full items-end rounded-md bg-white/[0.03] px-1">
                                        <div
                                            className="w-full rounded-t bg-red-400"
                                            style={{ height: `${Math.max(6, Math.round(((point.count || 0) / maxCount) * 100))}%` }}
                                            title={`${point.date}: ${point.count} failed logins`}
                                        />
                                    </div>
                                    <div className="text-center text-[11px] text-gray-500">
                                        {formatTrendDay(point.date)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
                            {total} failed {total === 1 ? 'attempt' : 'attempts'} in the last seven days
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function formatTrendDay(value) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function RiskMetric({ label, value, isLoading }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            {isLoading ? (
                <div className="mt-2 h-5 w-8 animate-pulse rounded bg-white/10" />
            ) : (
                <p className="mt-1 text-lg font-semibold text-white">{value}</p>
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

function getCopyAddressLabel(connection, isAddressCopied, copyAddressFailed) {
    if (copyAddressFailed) {
        return `Copy failed for ${connection.name}`;
    }
    if (isAddressCopied) {
        return `Copied address for ${connection.name}`;
    }
    return `Copy address for ${connection.name}`;
}

function ConnectionCard({
    conn,
    sessions,
    health,
    onConnect,
    onDelete,
    onFavorite,
    onCheckHealth,
    onCopyAddress,
    isAddressCopied,
    copyAddressFailed,
}) {
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
                            className={`h-8 w-8 ${copyAddressFailed ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200' : 'text-muted-foreground hover:bg-white/10 hover:text-white'}`}
                            onClick={() => onCopyAddress?.(conn)}
                            aria-label={getCopyAddressLabel(conn, isAddressCopied, copyAddressFailed)}
                        >
                            {isAddressCopied ? (
                                <Check className="h-4 w-4 text-green-300" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
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
