import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    LayoutDashboard,
    Terminal,
    Server,
    Settings,
    LogOut,
    ChevronDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
    { label: 'Sessions', icon: Terminal, view: 'sessions_dashboard' },
    // { label: 'Hosts', icon: Server }, // Removed for now as it's redundant with Dashboard
    { label: 'Settings', icon: Settings, view: 'settings' },
];

export function Navbar({ connected, user, onLogout, sessions = [], activeSessionId, onSwitchSession, setView }) {
    return (
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 px-0 md:px-2">
            <div className="flex flex-wrap gap-2 bg-brand-surface/50 p-1.5 rounded-full border border-brand-border/50 backdrop-blur-sm">
                {navItems.map((item) => (
                    <Button
                        key={item.label}
                        variant="ghost"
                        size="sm"
                        onClick={() => setView && setView(item.view)}
                        className="rounded-full px-4 gap-2 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <item.icon size={16} />
                        {item.label}
                    </Button>
                ))}
            </div>

            <div className="flex gap-4 items-center bg-brand-surface/50 py-1.5 px-3 rounded-full border border-brand-border/50 backdrop-blur-sm">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 px-2 gap-2 hover:bg-white/5 rounded-full">
                            <Badge
                                variant={connected ? 'default' : 'secondary'}
                                className={`px-3 py-0.5 border ${connected
                                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20'
                                    : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20'
                                    }`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${connected ? 'bg-green-400' : 'bg-orange-400'}`} />
                                {connected ? `${sessions.length} Active` : 'Idle'}
                            </Badge>
                            <ChevronDown size={14} className="text-gray-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#0d1117] border-white/10 text-gray-200">
                        <DropdownMenuLabel>Active Sessions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        {sessions.length === 0 ? (
                            <div className="p-2 text-xs text-gray-500 text-center">No active sessions</div>
                        ) : (
                            sessions.map(session => (
                                <DropdownMenuItem
                                    key={session.id}
                                    onClick={() => {
                                        onSwitchSession && onSwitchSession(session.id);
                                        setView && setView('terminal');
                                    }}
                                    className="flex items-center justify-between cursor-pointer hover:bg-white/5 focus:bg-white/5"
                                >
                                    <span className="truncate max-w-[150px]">{session.username}@{session.host}</span>
                                    {activeSessionId === session.id && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-4 w-[1px] bg-white/10" />

                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full px-3"
                    onClick={onLogout}
                >
                    <LogOut size={14} />
                    Logout
                </Button>

                <Avatar className="h-8 w-8 border-2 border-white/10">
                    <AvatarFallback className="bg-brand-surface text-sm font-medium text-white">
                        {user?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
    );
}
