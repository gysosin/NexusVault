import { SessionTerminal } from '../components/SessionTerminal';
import { Button } from '@/components/ui/button';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '@/lib/utils';

export const TerminalPage = ({ visible, setView }) => {
    const { sessions, activeSessionId, closeSession, updateSessionStatus, setSessionServerId } = useSession();
    const { token } = useAuth();

    return (
        <div
            className={cn(
                'absolute inset-0 z-20 bg-[#05070e] transition-transform duration-300 ease-in-out flex flex-col',
                visible ? 'translate-x-0' : 'translate-x-full'
            )}
        >
            <div className="flex-1 relative">
                {sessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <p>No active sessions.</p>
                        <Button variant="link" onClick={() => setView('dashboard')}>Start a connection</Button>
                    </div>
                )}

                {sessions.map(session => (
                        <SessionTerminal
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            onClose={() => closeSession(session.id)}
                            onStatusChange={updateSessionStatus}
                            terminalViewVisible={visible}
                            onSessionMetadata={(localId, serverId) => setSessionServerId(localId, serverId)}
                        />
                ))}
            </div>
        </div>
    );
};
