import React from 'react';
import { SessionTerminal } from '../components/SessionTerminal';
import SessionRDP from '../components/SessionRDP';
import { Button } from '@/components/ui/button';
import { useSession } from '../context/SessionContext';
import { Plus } from 'lucide-react';

export function TerminalPage({ visible, setView }) {
    const { sessions, activeSessionId, closeSession, updateSessionStatus, setActiveSessionId, setSessionServerId } = useSession();

    const activeSession = sessions.find(s => s.id === activeSessionId);

    if (!visible) return null;

    if (!activeSession) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                <div className="p-4 rounded-full bg-white/5">
                    <div className="w-12 h-12 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                        <span className="text-xl">+</span>
                    </div>
                </div>
                <p>No active session selected</p>
                <Button onClick={() => setView('dashboard')} variant="outline" className="border-white/10 hover:bg-white/5 text-gray-300">
                    <Plus className="w-4 h-4 mr-2" />
                    New Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            {sessions.map(session => {
                const isActive = activeSessionId === session.id;
                return (
                    <div
                        key={session.id}
                        className={`absolute inset-0 ${isActive ? 'z-10 visible' : 'z-0 invisible'}`}
                    >
                        {session.protocol === 'rdp' ? (
                            <SessionRDP
                                session={session}
                                onClose={() => {
                                    closeSession(session.id);
                                    if (isActive) setView('dashboard');
                                }}
                                onFocus={() => setActiveSessionId(session.id)}
                                onSessionMetadata={setSessionServerId}
                            />
                        ) : (
                            <SessionTerminal
                                session={session}
                                isActive={isActive}
                                onClose={() => {
                                    closeSession(session.id);
                                    if (isActive) setView('dashboard');
                                }}
                                onStatusChange={updateSessionStatus}
                                onSessionMetadata={setSessionServerId}
                                terminalViewVisible={visible}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
