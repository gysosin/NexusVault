import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Server, Activity, HardDrive } from 'lucide-react';
import { requestJson } from '@/api/client';

export function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, connections: 0, activeSessions: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const data = await requestJson('/api/admin/stats');
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-white p-4">Loading stats...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-black/20 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-brand-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.users}</div>
                    <p className="text-xs text-gray-500">Registered users</p>
                </CardContent>
            </Card>
            <Card className="bg-black/20 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Connections</CardTitle>
                    <HardDrive className="h-4 w-4 text-brand-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.connections}</div>
                    <p className="text-xs text-gray-500">Stored SSH profiles</p>
                </CardContent>
            </Card>
            <Card className="bg-black/20 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Active Sessions</CardTitle>
                    <Activity className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.activeSessions}</div>
                    <p className="text-xs text-gray-500">Live SSH connections</p>
                </CardContent>
            </Card>
            <Card className="bg-black/20 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Logged In Users</CardTitle>
                    <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white">{stats.loggedInUsers || 0}</div>
                    <p className="text-xs text-gray-500">Active web sessions</p>
                </CardContent>
            </Card>
            <Card className="bg-black/20 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">System Status</CardTitle>
                    <Server className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-400">Online</div>
                    <p className="text-xs text-gray-500">All systems operational</p>
                </CardContent>
            </Card>
        </div>
    );
}
