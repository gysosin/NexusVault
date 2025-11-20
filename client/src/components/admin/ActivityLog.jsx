import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search } from 'lucide-react';

export function ActivityLog() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        let result = logs;
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(log =>
                (log.username || '').toLowerCase().includes(lowerSearch) ||
                (log.action || '').toLowerCase().includes(lowerSearch) ||
                (log.target || '').toLowerCase().includes(lowerSearch)
            );
        }
        if (statusFilter !== 'all') {
            result = result.filter(log => log.status === statusFilter);
        }
        setFilteredLogs(result);
    }, [logs, search, statusFilter]);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/admin/activity', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
                setFilteredLogs(data);
            }
        } catch (err) {
            console.error('Failed to fetch activity logs', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = ['User', 'Action', 'Target', 'Status', 'Timestamp'];
        const csvContent = [
            headers.join(','),
            ...filteredLogs.map(log => [
                log.username || 'System',
                log.action,
                log.target,
                log.status,
                new Date(log.created_at).toISOString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    if (loading) return <div className="text-white p-4">Loading activity...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-semibold text-white">Activity Log</h2>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-full md:w-[200px] bg-black/20 border-white/10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[150px] bg-black/20 border-white/10 text-white">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1f2e] border-white/10 text-white">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Success">Success</SelectItem>
                            <SelectItem value="Failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleExport} variant="outline" className="border-white/10 hover:bg-white/5 text-gray-300">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="rounded-md border border-white/10 bg-black/20">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-gray-400">User</TableHead>
                            <TableHead className="text-gray-400">Action</TableHead>
                            <TableHead className="text-gray-400">Target</TableHead>
                            <TableHead className="text-gray-400">Status</TableHead>
                            <TableHead className="text-right text-gray-400">Timestamp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                    No activity logs found matching your filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map((log) => (
                                <TableRow key={log.id} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium text-white">{log.username || 'System'}</TableCell>
                                    <TableCell className="text-gray-300">{log.action}</TableCell>
                                    <TableCell className="text-gray-400">{log.target}</TableCell>
                                    <TableCell>
                                        <Badge variant={log.status === 'Success' ? 'outline' : 'destructive'} className={log.status === 'Success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}>
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-gray-400">
                                        {new Date(log.created_at).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
