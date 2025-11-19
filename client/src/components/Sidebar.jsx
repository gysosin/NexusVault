import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    PlusCircle,
    History,
    FileText,
    Cpu,
    HardDrive,
    Network,
    ChevronLeft,
    ChevronRight,
    Shield,
    LayoutDashboard
} from 'lucide-react';

const quickLinks = [
    { label: 'New session', icon: PlusCircle },
    { label: 'Recent hosts', icon: History },
    { label: 'Logs', icon: FileText },
];

const monitoringItems = [
    { label: 'CPU / RAM', icon: Cpu },
    { label: 'Disk', icon: HardDrive },
    { label: 'Network', icon: Network },
];

export function Sidebar({ collapsed, onToggle, view, setView, user }) {
    return (
        <div
            className={cn(
                "flex-shrink-0 bg-brand-surface border border-brand-border rounded-[28px] py-6 flex flex-col transition-all duration-300",
                collapsed ? 'w-[80px] px-2' : 'w-[260px] px-4'
            )}
        >
            <div className={cn("flex items-center mb-8", collapsed ? 'justify-center' : 'justify-between px-2')}>
                {!collapsed && (
                    <div>
                        <p className="font-bold text-lg tracking-tight text-white">Web SSH</p>
                        <p className="text-xs text-gray-400">Control center</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="h-8 w-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </Button>
            </div>

            <div className="space-y-6 flex-1">
                <div className="space-y-1">
                    <Button
                        variant={view === 'dashboard' ? 'secondary' : 'ghost'}
                        className={cn(
                            "w-full flex items-center gap-3 transition-colors",
                            collapsed ? 'justify-center px-0 h-12 w-12 mx-auto rounded-xl' : 'justify-start px-4 h-10 rounded-lg',
                            view === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'
                        )}
                        onClick={() => setView('dashboard')}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={20} />
                        {!collapsed && <span>Dashboard</span>}
                    </Button>

                    {user?.role === 'admin' && (
                        <Button
                            variant={view === 'admin' ? 'secondary' : 'ghost'}
                            className={cn(
                                "w-full flex items-center gap-3 transition-colors",
                                collapsed ? 'justify-center px-0 h-12 w-12 mx-auto rounded-xl' : 'justify-start px-4 h-10 rounded-lg',
                                view === 'admin' ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'
                            )}
                            onClick={() => setView('admin')}
                            title="Admin Panel"
                        >
                            <Shield size={20} />
                            {!collapsed && <span>Admin</span>}
                        </Button>
                    )}
                </div>

                <Separator className="bg-white/5 mx-2" />
                <Section title="Quick Links" items={quickLinks} collapsed={collapsed} />
                <Separator className="bg-white/5 mx-2" />
                <Section title="Monitoring" items={monitoringItems} collapsed={collapsed} />
            </div>
        </div>
    );
}

function Section({ title, items, collapsed }) {
    return (
        <div className="space-y-2">
            {!collapsed && (
                <p className="px-4 text-xs font-bold tracking-[0.15em] uppercase text-gray-500">
                    {title}
                </p>
            )}
            <div className="space-y-1">
                {items.map((item) => (
                    <Button
                        key={item.label}
                        variant="ghost"
                        className={cn(
                            "w-full flex items-center gap-3 text-gray-300 hover:text-white hover:bg-white/5 transition-colors",
                            collapsed ? 'justify-center px-0 h-12 w-12 mx-auto rounded-xl' : 'justify-start px-4 h-10 rounded-lg'
                        )}
                        title={collapsed ? item.label : undefined}
                    >
                        <item.icon size={20} className={collapsed ? '' : 'text-gray-400 group-hover:text-white'} />
                        {!collapsed && <span>{item.label}</span>}
                    </Button>
                ))}
            </div>
        </div>
    );
}
