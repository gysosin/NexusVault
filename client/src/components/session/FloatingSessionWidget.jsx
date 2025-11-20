import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Terminal, Power } from 'lucide-react';

export function FloatingSessionWidget({ session, preview, onClick, onDisconnect }) {
    if (!session) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <Card
                className="w-80 bg-brand-surface border-brand-border shadow-2xl overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all group"
                onClick={onClick}
            >
                <div className="h-36 bg-black/70 relative p-3 font-mono text-[9px] text-gray-200 overflow-hidden border-b border-white/5 rounded-t-xl">
                    <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="w-full h-full flex items-end">
                        <pre className="whitespace-pre-wrap break-words leading-tight tracking-tighter w-full m-0">
                            {preview || (
                                <>
                                    <span className="text-green-400">➜</span> ~ ssh {session.username}@{session.host}{'\n'}
                                    Welcome to {session.host}{'\n'}
                                    [Active Session Running...]
                                </>
                            )}
                        </pre>
                    </div>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px]">
                        <Button size="sm" variant="secondary" className="gap-2 pointer-events-auto">
                            <Maximize2 size={14} />
                            Expand Terminal
                        </Button>
                    </div>
                </div>

                <div className="p-3 bg-brand-surface border-t border-brand-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${session.attached ? 'bg-green-500 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{session.name || session.host}</span>
                            <span className="text-xs text-gray-400">
                                {session.username}@{session.host}
                                {!session.attached && ' • paused'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Terminal size={16} className="text-purple-400" />
                        {onDisconnect && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDisconnect();
                                }}
                            >
                                <Power size={14} />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
