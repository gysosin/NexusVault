import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { encryptPayload } from '../../api/encryption';
import { withWebSocketToken } from '../../api/websocket';
import { ScrollText, Power, X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionHistory } from './SessionHistory';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useAuth } from '../../context/AuthContext';

export function SessionTerminal({
    session,
    isActive,
    onClose,
    onStatusChange,
    wsEndpoint,
    terminalViewVisible = true,
    isPreview = false,
    onSessionMetadata,
}) {
    const { token: authToken } = useAuth();
    const termRef = useRef(null);
    const fitAddonRef = useRef(null);
    const termContainerRef = useRef(null);
    const wsRef = useRef(null);
    const isMountedRef = useRef(true);
    const [status, setStatus] = useState('Initializing...');
    const onSessionMetadataRef = useRef(onSessionMetadata);

    useEffect(() => {
        onSessionMetadataRef.current = onSessionMetadata;
    }, [onSessionMetadata]);

    const [logs, setLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const wsUrl = useMemo(() => {
        if (wsEndpoint) return wsEndpoint;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = (import.meta.env.DEV && import.meta.env.VITE_SERVER_PORT)
            ? `localhost:${import.meta.env.VITE_SERVER_PORT}`
            : window.location.host;
        return `${protocol}//${host}/ws`;
    }, [wsEndpoint]);

    const addLog = useCallback((message) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(`[Session ${session.id}] ${message}`);
        setLogs(prev => [...prev, logEntry]);
    }, [session.id]);

    const updateStatus = useCallback((message) => {
        setStatus(message);
        onStatusChange?.(session.id, message);
    }, [session.id, onStatusChange]);

    const resizeTimeoutRef = useRef(null);

    const sendResize = useCallback(() => {
        if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);

        resizeTimeoutRef.current = setTimeout(() => {
            const term = termRef.current;
            const ws = wsRef.current;
            const container = termContainerRef.current;

            if (!isMountedRef.current) return;

            if (!container || !term || !fitAddonRef.current) return;

            // Only fit if the container has dimensions (is visible)
            if (container.clientWidth > 0 && container.clientHeight > 0) {
                try {
                    // Check if terminal is actually mounted in DOM
                    if (!term.element || !term.element.isConnected) return;

                    fitAddonRef.current.fit();

                    if (ws && ws.readyState === WebSocket.OPEN && !isPreview) {
                        ws.send(JSON.stringify({
                            type: 'resize',
                            cols: term.cols,
                            rows: term.rows,
                            width: container.clientWidth,
                            height: container.clientHeight,
                        }));
                    }
                } catch (e) {
                    console.warn('Resize error:', e);
                }
            }
        }, 100); // 100ms debounce for smooth resizing without thrashing
    }, [isPreview]);

    // Initialize Terminal
    useEffect(() => {
        if (!terminalViewVisible || !termContainerRef.current) {
            return () => { };
        }

        isMountedRef.current = true;

        let resizeObserver;
        let pendingInitObserver;
        let terminalDisposal;
        let initialized = false;
        let initialRafId;
        let initRafId;

        const ensureTerminal = () => {
            const container = termContainerRef.current;
            if (!container || initialized) return;

            const { clientWidth, clientHeight } = container;
            // Check if container is actually visible in the DOM
            if (clientWidth === 0 || clientHeight === 0 || !container.offsetParent) {
                if (!pendingInitObserver) {
                    pendingInitObserver = new ResizeObserver(() => {
                        if (!termContainerRef.current) return;
                        if (termContainerRef.current.clientWidth > 0 && termContainerRef.current.clientHeight > 0 && termContainerRef.current.offsetParent) {
                            pendingInitObserver?.disconnect();
                            pendingInitObserver = null;
                            ensureTerminal();
                        }
                    });
                    pendingInitObserver.observe(container);
                }
                return;
            }

            initialized = true;

            const term = new XTerm({
                cursorBlink: true,
                convertEol: true,
                fontSize: 14,
                theme: {
                    background: '#05070e',
                    foreground: '#f8fbff',
                    cursor: '#65d4ff',
                },
                fontFamily: 'JetBrains Mono, Fira Code, Menlo, Consolas, monospace',
                fontWeight: 400,
                letterSpacing: 0.03,
                rendererType: 'canvas',
                disableStdin: isPreview, // Disable input for previews
            });

            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);

            term.open(container);
            termRef.current = term;
            fitAddonRef.current = fitAddon;

            // Request replay if socket is already open (e.g. when switching tabs back to terminal)
            const ws = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('[SessionTerminal] Requesting replay for', session.id);
                ws.send(JSON.stringify({ type: 'replay' }));
            } else {
                console.log('[SessionTerminal] WS not ready for replay', session.id, ws?.readyState);
            }

            term.writeln(`Connecting to ${session.username}@${session.host}...`);

            // Flush buffered data
            if (window.termBuffer && window.termBuffer[session.id]) {
                const buffer = window.termBuffer[session.id];
                while (buffer.length > 0) {
                    term.write(buffer.shift());
                }
                delete window.termBuffer[session.id];
            }

            // Initial fit and resize
            initialRafId = requestAnimationFrame(() => {
                initialRafId = null;
                if (!isMountedRef.current) return;
                if (term.element && term.element.isConnected) {
                    try {
                        fitAddon.fit();
                        sendResize();
                    } catch (e) {
                        console.warn('Initial fit error:', e);
                    }
                }
            });

            resizeObserver = new ResizeObserver(() => {
                // requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
                requestAnimationFrame(() => {
                    if (!isMountedRef.current) return;
                    if (term.element && term.element.isConnected) {
                        sendResize();
                    }
                });
            });
            resizeObserver.observe(container);
            window.addEventListener('resize', sendResize);

            const disposable = term.onData((chunk) => {
                if (isPreview) return; // Double check: do not send input in preview mode
                const ws = wsRef.current;
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'data', data: chunk }));
                }
            });

            terminalDisposal = () => {
                disposable.dispose();
                resizeObserver?.disconnect();
                window.removeEventListener('resize', sendResize);
                termRef.current = null;
                fitAddonRef.current = null;
                term.dispose();
            };
        };

        initRafId = requestAnimationFrame(() => {
            initRafId = null;
            ensureTerminal();
        });

        return () => {
            isMountedRef.current = false;
            if (initRafId) {
                cancelAnimationFrame(initRafId);
                initRafId = null;
            }
            if (initialRafId) {
                cancelAnimationFrame(initialRafId);
                initialRafId = null;
            }
            pendingInitObserver?.disconnect();
            terminalDisposal?.();
        };
    }, [isPreview, sendResize, session.host, session.id, session.username, terminalViewVisible]);

    // Handle WebSocket Connection
    useEffect(() => {
        if (!authToken || !session) return;
        // if (isPreview) return; // Allow websockets for previews now

        const ws = new WebSocket(withWebSocketToken(wsUrl, authToken));
        wsRef.current = ws;

        ws.onopen = () => {
            addLog('WebSocket opened');
            updateStatus('Connected');

            const sessionServerId = session.serverId || session.sessionId || session.id;
            const payloadType = session.serverId ? 'resume' : (session.mode || 'connect');
            const payload = {
                type: payloadType,
                token: authToken,
                sessionId: sessionServerId,
                id: sessionServerId,
                host: session.host,
                username: session.username,
                port: session.port,
                connectionId: session.connectionId,
            };

            // Encrypt sensitive data if it's a connect request
            if (payload.type === 'connect') {
                const encrypted = encryptPayload({
                    type: session.protocol || 'ssh',
                    host: session.host,
                    username: session.username,
                    password: session.password,
                    port: session.port,
                    token: authToken,
                    connectionId: session.connectionId,
                    restoreHistory: session.restoreHistory,
                });
                ws.send(JSON.stringify({ type: 'connect', payload: encrypted }));
            } else {
                if (!payload.sessionId) {
                    console.warn('Attempted to resume without server session id');
                    return;
                }
                ws.send(JSON.stringify({
                    type: 'resume',
                    sessionId: payload.sessionId,
                    token: authToken,
                }));
            }

            sendResize();
        };

        ws.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }

            switch (data.type) {
                case 'data':
                    if (termRef.current) {
                        termRef.current.write(data.data);
                    } else {
                        // Buffer data if terminal is not ready
                        if (!window.termBuffer) window.termBuffer = {};
                        if (!window.termBuffer[session.id]) window.termBuffer[session.id] = [];
                        window.termBuffer[session.id].push(data.data);
                    }
                    break;
                case 'status':
                    updateStatus(data.message);
                    break;
                case 'error':
                    updateStatus(`Error: ${data.message}`);
                    termRef.current?.writeln(`\r\n\x1b[31mError: ${data.message}\x1b[0m`);
                    break;
                case 'session':
                    if (data.sessionId) {
                        onSessionMetadataRef.current?.(session.id, data.sessionId);
                    }
                    break;
            }
        };

        ws.onclose = () => {
            updateStatus('Disconnected');
            termRef.current?.writeln('\r\n\x1b[31m[Disconnected]\x1b[0m');
            // Optional: Auto-close tab after delay? Or let user close it.
        };

        ws.onerror = (err) => {
            updateStatus('Connection Error');
            console.error('WS Error', err);
        };

        return () => {
            // Prevent handlers from firing during cleanup
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.onopen = null;

            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [addLog, authToken, isPreview, sendResize, session, updateStatus, wsUrl]);

    // Handle Visibility/Resize when switching tabs
    useEffect(() => {
        if (isActive) {
            // Small delay to allow layout to settle (increased to match transition duration)
            setTimeout(() => {
                console.log('[SessionTerminal] Fitting and focusing', session.id);
                sendResize();
                termRef.current?.focus();
            }, 350);
        }
    }, [isActive, sendResize, session.id]);

    const handleDisconnect = useCallback(() => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'disconnect' }));
        }
        onClose();
    }, [onClose]);

    if (isPreview) {
        return (
            <div className="h-full w-full bg-[#05070e]">
                <div ref={termContainerRef} className="h-full w-full" />
            </div>
        );
    }

    return (
        <div
            className={`h-full w-full bg-[#090c14] absolute inset-0 flex flex-col ${isActive ? 'z-10' : 'z-0'}`}
        >
            {/* Terminal Header/Toolbar */}
            <div className="h-10 bg-[#0d1117] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${(status === 'Connected' || status === 'Session resumed.' || status === 'Connected to host.') ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-yellow-400'}`} />
                    <span className="text-sm font-medium text-gray-300">{session.username}@{session.host}</span>
                    <span className="text-xs text-gray-600 font-mono px-2 py-0.5 bg-white/5 rounded">{status}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLogs(true)}
                        className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/5"
                    >
                        <ScrollText className="w-3.5 h-3.5 mr-1.5" />
                        Logs
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                        className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/5"
                    >
                        <History className="w-3.5 h-3.5 mr-1.5" />
                        History
                    </Button>
                    <div className="h-4 w-[1px] bg-white/10 mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnect}
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <Power className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                    </Button>
                </div>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 relative bg-[#05070e] p-1">
                <div ref={termContainerRef} className="h-full w-full" />
            </div>

            {/* Log Viewer Dialog */}
            <Dialog open={showLogs} onOpenChange={setShowLogs}>
                <DialogContent className="bg-[#0d1117] border-white/10 text-gray-200 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Session Logs - {session.username}@{session.host}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] w-full rounded-md border border-white/10 bg-black/50 p-4 font-mono text-xs">
                        {logs.length === 0 ? (
                            <div className="text-gray-500 italic">No logs recorded yet.</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0 text-gray-300">
                                    {log}
                                </div>
                            ))
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <SessionHistory
                open={showHistory}
                onOpenChange={setShowHistory}
                connectionId={session.connectionId}
                authToken={authToken}
            />
        </div>
    );
}
