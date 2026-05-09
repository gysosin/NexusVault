import React, { Suspense, lazy, useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Monitor, X, Plus, Activity, Wifi, Terminal, Folder, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const SessionRDP = lazy(() => import('./SessionRDP'));
const SessionTerminal = lazy(() => import('./SessionTerminal').then((module) => ({ default: module.SessionTerminal })));

const PreviewFallback = () => (
    <div className="h-full w-full bg-[#05070e] flex items-center justify-center text-xs text-gray-500">
        Loading preview...
    </div>
);

function PortalPreview({ session, isActive, parentRect }) {
    if (!parentRect) return null;

    // Calculate position: to the left of the sidebar item
    const style = {
        top: parentRect.top,
        left: parentRect.left - 420, // 400px width + 20px gap
    };

    return createPortal(
        <Motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={style}
            className="fixed w-[400px] h-[300px] bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[9999]"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5 z-10 relative">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <span className="text-xs font-medium text-gray-200 truncate max-w-[200px]">
                        {session.username}@{session.host}
                    </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{(session.protocol || 'ssh').toUpperCase()}</span>
            </div>

            {/* Real Content Preview */}
            <div className="relative w-full h-full bg-black">
                <div className="absolute inset-0 w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none select-none">
                    <Suspense fallback={<PreviewFallback />}>
                        {session.protocol === 'rdp' ? (
                            <SessionRDP
                                session={session}
                                onClose={() => { }}
                                onFocus={() => { }}
                                onSessionMetadata={() => { }}
                                isPreview={true}
                            />
                        ) : (
                            <SessionTerminal
                                session={session}
                                isActive={true}
                                terminalViewVisible={true}
                                isPreview={true}
                            />
                        )}
                    </Suspense>
                </div>
            </div>
        </Motion.div>,
        document.body
    );
}

function SessionItem({ session, isActive, onClick, onClose, isSidebarExpanded }) {
    const [isHovered, setIsHovered] = useState(false);
    const [rect, setRect] = useState(null);
    const itemRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            if (itemRef.current) {
                setRect(itemRef.current.getBoundingClientRect());
            }
            setIsHovered(true);
        }, 300); // 300ms debounce
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
    };

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    return (
        <div
            ref={itemRef}
            className="relative group"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={onClick}
                className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                    isActive
                        ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                        : "hover:bg-white/5 border border-transparent text-gray-400 hover:text-gray-200"
                )}
            >
                <div className="relative shrink-0">
                    {session.protocol === 'rdp' ? (
                        <Monitor className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]")} />
                    ) : (
                        <Terminal className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]")} />
                    )}
                    {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_4px_rgba(96,165,250,1)] border border-[#0d1117]" />
                    )}
                </div>

                {isSidebarExpanded && (
                    <div className="flex-1 text-left overflow-hidden">
                        <div className="text-sm font-medium truncate">
                            {session.username}@{session.host}
                        </div>
                        <div className="text-[10px] opacity-60 truncate font-mono">
                            {session.status || 'Ready'}
                        </div>
                    </div>
                )}
            </button>

            {/* Close Button */}
            {isSidebarExpanded && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose(session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-gray-500 transition-all"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Preview on Hover (only when collapsed or requested) */}
            <AnimatePresence>
                {isHovered && (
                    <PortalPreview session={session} isActive={isActive} parentRect={rect} />
                )}
            </AnimatePresence>
        </div>
    );
}

function SessionGroup({ sessions, activeSessionId, onSwitchSession, onCloseSession, isSidebarExpanded }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const firstSession = sessions[0];
    const title = firstSession ? `${firstSession.username}@${firstSession.host}` : 'Unknown';

    if (!isSidebarExpanded) {
        return (
            <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                    {sessions.map(session => (
                        <Motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SessionItem
                                session={session}
                                isActive={activeSessionId === session.id}
                                onClick={() => onSwitchSession(session.id)}
                                onClose={onCloseSession}
                                isSidebarExpanded={isSidebarExpanded}
                            />
                        </Motion.div>
                    ))}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="mb-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
            >
                <Folder className="w-3.5 h-3.5" />
                <span className="flex-1 text-left truncate">{title}</span>
                <span className="bg-white/10 px-1.5 rounded-full text-[10px]">{sessions.length}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", !isExpanded && "-rotate-90")} />
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <Motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pl-2 space-y-1 mt-1">
                            <AnimatePresence mode="popLayout">
                                {sessions.map(session => (
                                    <Motion.div
                                        key={session.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <SessionItem
                                            session={session}
                                            isActive={activeSessionId === session.id}
                                            onClick={() => onSwitchSession(session.id)}
                                            onClose={onCloseSession}
                                            isSidebarExpanded={isSidebarExpanded}
                                        />
                                    </Motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function SessionSidebar({ sessions, activeSessionId, onSwitchSession, onCloseSession, onNewSession }) {
    const [isExpanded, setIsExpanded] = useState(true);

    const groupedSessions = useMemo(() => {
        const groups = {};
        sessions.forEach(session => {
            const key = session.connectionId || `${session.username}@${session.host}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(session);
        });
        return Object.entries(groups);
    }, [sessions]);

    return (
        <Motion.div
            initial={false}
            animate={{ width: isExpanded ? 280 : 80 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
                "h-full bg-brand-surface border border-brand-border flex flex-col shadow-2xl relative flex-shrink-0 rounded-[28px] py-6",
                !isExpanded && "items-center"
            )}
        >
            {/* Toggle Handle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute -left-3 top-10 w-6 h-6 bg-[#0d1117] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:scale-110 transition-all z-50"
            >
                {isExpanded ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>

            {/* Header */}
            <div className={cn("flex items-center mb-4 px-4", isExpanded ? "justify-between" : "justify-center")}>
                {isExpanded ? (
                    <span className="text-sm font-semibold text-gray-200">Active Sessions</span>
                ) : (
                    <Terminal className="w-5 h-5 text-gray-400" />
                )}
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                    {groupedSessions.map(([key, groupSessions]) => (
                        <SessionGroup
                            key={key}
                            sessions={groupSessions}
                            activeSessionId={activeSessionId}
                            onSwitchSession={onSwitchSession}
                            onCloseSession={onCloseSession}
                            isSidebarExpanded={isExpanded}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="px-4 mt-2">
                <Button
                    variant="ghost"
                    onClick={onNewSession}
                    className={cn(
                        "w-full flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5",
                        !isExpanded && "justify-center px-0 h-10 w-10 rounded-xl"
                    )}
                    title={!isExpanded ? "New Connection" : undefined}
                >
                    <Plus className="w-5 h-5" />
                    {isExpanded && <span>New Connection</span>}
                </Button>
            </div>
        </Motion.div>
    );
}

export default SessionSidebar;
