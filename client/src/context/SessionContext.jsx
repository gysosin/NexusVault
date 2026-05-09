import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import * as sessionApi from '../api/sessions';
import { withWebSocketToken } from '../api/websocket';
import { useAuth } from './AuthContext';

const SessionContext = createContext(null);
const SESSION_STORAGE_PREFIX = 'active_server_sessions';

const makeId = () => {
    if (typeof crypto?.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const SessionProvider = ({ children }) => {
    const { token, user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const persistedSessionIdsRef = useRef(new Set());
    const storageKey = user?.id ? `${SESSION_STORAGE_PREFIX}:${user.id}` : null;

    const persistSessionIds = useCallback((setValue) => {
        if (!storageKey || typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(Array.from(setValue)));
        } catch {
            // Ignore storage errors
        }
    }, [storageKey]);

    const replacePersistedSessionIds = useCallback((nextSet) => {
        persistedSessionIdsRef.current = nextSet;
        persistSessionIds(nextSet);
    }, [persistSessionIds]);

    useEffect(() => {
        if (!storageKey || typeof window === 'undefined') {
            replacePersistedSessionIds(new Set());
            return;
        }
        try {
            const raw = window.localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            replacePersistedSessionIds(new Set((parsed || []).filter(Boolean)));
        } catch {
            replacePersistedSessionIds(new Set());
        }
    }, [storageKey, replacePersistedSessionIds]);

    const addPersistedSessionId = useCallback((serverId) => {
        if (!serverId) return;
        const current = persistedSessionIdsRef.current;
        if (current.has(serverId)) return;
        const next = new Set(current);
        next.add(serverId);
        replacePersistedSessionIds(next);
    }, [replacePersistedSessionIds]);

    const removePersistedSessionId = useCallback((serverId) => {
        if (!serverId) return;
        const current = persistedSessionIdsRef.current;
        if (!current.has(serverId)) return;
        const next = new Set(current);
        next.delete(serverId);
        replacePersistedSessionIds(next);
    }, [replacePersistedSessionIds]);

    const prunePersistedSessionIds = useCallback((activeIdsSet) => {
        const current = persistedSessionIdsRef.current;
        let changed = false;
        const next = new Set();
        current.forEach((id) => {
            if (activeIdsSet.has(id)) {
                next.add(id);
            } else {
                changed = true;
            }
        });
        if (changed) {
            replacePersistedSessionIds(next);
            return next;
        }
        return current;
    }, [replacePersistedSessionIds]);

    const fetchActiveSessions = useCallback(async () => {
        if (!token) return;
        try {
            const data = await sessionApi.getActiveSessions();
            if (!Array.isArray(data) || data.length === 0) {
                setSessions([]);
                setActiveSessionId(null);
                replacePersistedSessionIds(new Set());
                return;
            }

            const activeIds = new Set(data.map((s) => s.id));
            const allowedIds = prunePersistedSessionIds(activeIds);
            const idsToRestore = allowedIds && allowedIds.size > 0 ? allowedIds : persistedSessionIdsRef.current;

            if (!idsToRestore || idsToRestore.size === 0) {
                setSessions([]);
                setActiveSessionId(null);
                return;
            }

            const restoredSessions = data
                .filter((s) => idsToRestore.has(s.id))
                .map((s) => ({
                    id: makeId(),
                    serverId: s.id,
                    mode: 'resume',
                    protocol: s.protocol || s.type || 'ssh',
                    host: s.host,
                    username: s.username,
                    port: s.port,
                    connectionId: s.connectionId,
                    title: `${s.username}@${s.host}`,
                    status: 'Restored',
                }));

            setSessions(restoredSessions);
            setActiveSessionId(restoredSessions[0]?.id ?? null);
        } catch (err) {
            console.error('Failed to fetch active sessions', err);
            setSessions([]);
            setActiveSessionId(null);
        }
    }, [token, prunePersistedSessionIds, replacePersistedSessionIds]);

    useEffect(() => {
        if (!token) {
            setSessions([]);
            setActiveSessionId(null);
            replacePersistedSessionIds(new Set());
            return;
        }

        fetchActiveSessions();

        // WebSocket for notifications
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = (import.meta.env.DEV && import.meta.env.VITE_SERVER_PORT)
            ? `localhost:${import.meta.env.VITE_SERVER_PORT}`
            : window.location.host;
        const wsUrl = `${protocol}//${host}/ws/notifications`;

        let ws = null;
        let reconnectTimeout = null;
        let shouldReconnect = true;

        const connect = () => {
            ws = new WebSocket(withWebSocketToken(wsUrl, token));

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'session_started') {
                        fetchActiveSessions(); // Refresh to get full details
                    } else if (msg.type === 'session_terminated') {
                        const terminatedId = msg.sessionId;
                        setSessions(prev => prev.filter(s => s.id !== terminatedId && s.serverId !== terminatedId));
                        setActiveSessionId(prev => prev === terminatedId ? null : prev);
                    }
                } catch (e) {
                    console.error('Failed to parse notification:', e);
                }
            };

            ws.onclose = () => {
                if (shouldReconnect) {
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            shouldReconnect = false;
            if (ws) ws.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [token, fetchActiveSessions, replacePersistedSessionIds]);

    const createSession = useCallback((connectionDetails) => {
        if (!connectionDetails?.host || !connectionDetails?.username) {
            return;
        }

        const session = {
            id: makeId(),
            mode: 'connect',
            protocol: connectionDetails.type || 'ssh',
            host: connectionDetails.host,
            username: connectionDetails.username,
            port: connectionDetails.port || 22,
            password: connectionDetails.password,
            connectionId: connectionDetails.id || connectionDetails.connectionId || null,
            title: `${connectionDetails.username}@${connectionDetails.host}`,
            status: 'Initializing...',
            serverId: null,
            restoreHistory: connectionDetails.restoreHistory || false,
        };

        setSessions(prev => [...prev, session]);
        setActiveSessionId(session.id);
    }, []);

    const closeSession = useCallback((sessionId) => {
        setSessions(prev => {
            let removedServerId = null;
            const next = prev.filter(s => {
                if (s.id === sessionId) {
                    removedServerId = s.serverId || removedServerId;
                    return false;
                }
                return true;
            });
            if (activeSessionId === sessionId) {
                if (next.length > 0) {
                    setActiveSessionId(next[next.length - 1].id);
                } else {
                    setActiveSessionId(null);
                }
            }
            if (removedServerId) {
                removePersistedSessionId(removedServerId);
            }
            return next;
        });
    }, [activeSessionId, removePersistedSessionId]);

    const updateSessionStatus = useCallback((id, status) => {
        setSessions(prev => prev.map(s =>
            s.id === id ? { ...s, status } : s
        ));
    }, []);

    const setSessionServerId = useCallback((id, serverId) => {
        if (!serverId) return;
        let shouldPersist = false;
        setSessions(prev => prev.map(s => {
            if (s.id !== id) return s;
            if (s.serverId === serverId) {
                return s;
            }
            shouldPersist = true;
            return { ...s, serverId };
        }));
        if (shouldPersist) {
            addPersistedSessionId(serverId);
        }
    }, [addPersistedSessionId]);

    return (
        <SessionContext.Provider value={{
            sessions,
            activeSessionId,
            setActiveSessionId,
            createSession,
            closeSession,
            updateSessionStatus,
            setSessionServerId,
        }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};
