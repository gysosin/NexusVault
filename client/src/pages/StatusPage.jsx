import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Database, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestJson } from '@/api/client';

export function StatusPage() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const data = await requestJson('/api/health');
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch status:', error);
            setStatus({
                status: 'down',
                database: 'unknown',
                redis: 'unknown'
            });
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'operational':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'degraded':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'down':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-gray-500" />;
        }
    };

    const ServiceCard = ({ name, status, icon: Icon }) => (
        <Card className="bg-brand-surface border-brand-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">
                    {name}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2">
                    {getStatusIcon(status)}
                    <div className="text-2xl font-bold capitalize text-white">{status || 'Unknown'}</div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">System Status</h1>
                    <p className="text-gray-400 mt-2">
                        Real-time monitoring of system services and connectivity.
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchStatus}
                        disabled={loading}
                        className="bg-brand-surface border-brand-border hover:bg-white/5"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <ServiceCard
                    name="API Backend"
                    status={status?.status === 'operational' || status?.status === 'degraded' ? 'operational' : 'down'}
                    icon={Server}
                />
                <ServiceCard
                    name="Database (PostgreSQL)"
                    status={status?.database}
                    icon={Database}
                />
                <ServiceCard
                    name="Redis Cache"
                    status={status?.redis}
                    icon={Activity}
                />
            </div>

            <Card className="bg-brand-surface border-brand-border">
                <CardHeader>
                    <CardTitle className="text-white">Overall System Health</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${status?.status === 'operational' ? 'bg-green-500/10' :
                            status?.status === 'degraded' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                            }`}>
                            {getStatusIcon(status?.status)}
                        </div>
                        <div>
                            <p className="font-medium text-white">
                                {status?.status === 'operational' ? 'All systems operational' :
                                    status?.status === 'degraded' ? 'Some systems are experiencing issues' :
                                        'System outage detected'}
                            </p>
                            <p className="text-sm text-gray-400">
                                {status?.status === 'operational'
                                    ? 'All services are running normally.'
                                    : 'Please check the individual service status above.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
