import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Terminal, Trash2, Search, Server, Share2, Activity } from 'lucide-react';
import { AddConnectionDialog } from '../dialogs/AddConnectionDialog';
import { SharingDialog } from '../dialogs/SharingDialog';
import { Badge } from '@/components/ui/badge';

export function Dashboard({ connections, onConnect, onDelete, onAdd, sessions = [] }) {
    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [sharingConnection, setSharingConnection] = useState(null);

    const filtered = connections.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.host.toLowerCase().includes(search.toLowerCase())
    );

    const getActiveSessionCount = (connectionId) => {
        return sessions.filter(s => s.connectionId === connectionId || (s.host === connectionId.host && s.username === connectionId.username)).length;
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 animate-in fade-in duration-500 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your SSH connections and servers.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> New Connection
                </Button>
            </div>

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
                {filtered.map((conn) => {
                    const activeCount = getActiveSessionCount(conn.id);
                    const isConnected = activeCount > 0;

                    return (
                        <Card key={conn.id} className="group hover:shadow-xl transition-all duration-300 border-white/10 bg-[#0d1117]/60 backdrop-blur-md hover:bg-[#0d1117]/80">
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
                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-white/5"
                                            onClick={() => setSharingConnection(conn)}
                                            title="Share Connection"
                                        >
                                            <Share2 className="h-4 w-4" />
                                        </Button>
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
                })}
                {filtered.length === 0 && (
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

            <SharingDialog
                open={!!sharingConnection}
                onOpenChange={(open) => !open && setSharingConnection(null)}
                connectionName={sharingConnection?.name || ''}
            />
        </div>
    );
}
