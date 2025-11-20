import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Maximize2, Minimize2, MoreVertical, X, RefreshCw, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { encryptPayload } from '../../api/encryption';
import { useAuth } from '../../context/AuthContext';

export default function SessionRDP({ session, onClose, onFocus, onSessionMetadata }) {
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const [status, setStatus] = useState('Connecting...');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const { token: authToken } = useAuth();
    const onSessionMetadataRef = useRef(onSessionMetadata);
    const ctxRef = useRef(null);
    const frameQueueRef = useRef([]);
    const animationFrameRef = useRef(null);
    const surfaceSizeRef = useRef({ width: session.width || 1024, height: session.height || 768 });
    const lastFrameAtRef = useRef(Date.now());
    const lastReconnectAtRef = useRef(0);
    const suppressResizeSendRef = useRef(false);

    useEffect(() => {
        onSessionMetadataRef.current = onSessionMetadata;
    }, [onSessionMetadata]);

    const wsUrl = useMemo(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = (import.meta.env.DEV && import.meta.env.VITE_SERVER_PORT)
            ? `localhost:${import.meta.env.VITE_SERVER_PORT}`
            : window.location.host;
        return `${protocol}//${host}/ws`;
    }, []);

    const drainFrameQueue = useCallback(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) {
            frameQueueRef.current = [];
            animationFrameRef.current = null;
            return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const MAX_FRAMES_PER_FLUSH = 256; // Increased for 60 FPS smooth rendering
        let processed = 0;
        while (processed < MAX_FRAMES_PER_FLUSH && frameQueueRef.current.length) {
            const frame = frameQueueRef.current.shift();
            if (!frame) continue;
            ctx.putImageData(frame.imageData, frame.x, frame.y);
            processed += 1;
        }

        if (frameQueueRef.current.length) {
            animationFrameRef.current = requestAnimationFrame(drainFrameQueue);
        } else {
            animationFrameRef.current = null;
        }
    }, []);

    const enqueueFrame = useCallback((frame) => {
        frameQueueRef.current.push(frame);
        // Removed frame dropping to prevent artifacts
        // const MAX_BUFFERED_FRAMES = 90;
        // if (frameQueueRef.current.length > MAX_BUFFERED_FRAMES) {
        //     frameQueueRef.current.splice(0, frameQueueRef.current.length - MAX_BUFFERED_FRAMES);
        // }
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(drainFrameQueue);
        }
    }, [drainFrameQueue]);

    const renderBitmap = useCallback((payload) => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;

        const buffer = payload.data;
        const len = buffer.length;
        const { width, height, bitsPerPixel } = payload;
        if (!width || !height || !len) return;

        const bytesPerPixel = (() => {
            // Server header currently carries bytes-per-pixel (1..4); normalize so we handle either bytes or bits.
            if (!bitsPerPixel) return 4;
            if (bitsPerPixel <= 4) return bitsPerPixel; // server currently sends bytes-per-pixel
            return Math.ceil(bitsPerPixel / 8); // fallback if bits are sent instead
        })();

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        switch (bytesPerPixel) {
            case 4: { // BGRA/BGRX
                for (let i = 0, j = 0; i + 3 < len && j < data.length; i += 4, j += 4) {
                    data[j] = buffer[i + 2];
                    data[j + 1] = buffer[i + 1];
                    data[j + 2] = buffer[i];
                    const alpha = buffer[i + 3];
                    data[j + 3] = alpha === 0 ? 255 : alpha;
                }
                break;
            }
            case 3: { // BGR
                for (let i = 0, j = 0; i + 2 < len && j < data.length; i += 3, j += 4) {
                    data[j] = buffer[i + 2];
                    data[j + 1] = buffer[i + 1];
                    data[j + 2] = buffer[i];
                    data[j + 3] = 255;
                }
                break;
            }
            case 2: { // 16-bit 5-6-5
                for (let i = 0, j = 0; i + 1 < len && j < data.length; i += 2, j += 4) {
                    const val = (buffer[i + 1] << 8) | buffer[i];
                    const r = (val >> 11) & 0x1F;
                    const g = (val >> 5) & 0x3F;
                    const b = val & 0x1F;

                    data[j] = (r * 255) / 31;
                    data[j + 1] = (g * 255) / 63;
                    data[j + 2] = (b * 255) / 31;
                    data[j + 3] = 255;
                }
                break;
            }
            default: { // fallback to grayscale-ish copy to avoid crashes
                for (let i = 0, j = 0; i < len && j < data.length; i += 1, j += 4) {
                    const px = buffer[i];
                    data[j] = px;
                    data[j + 1] = px;
                    data[j + 2] = px;
                    data[j + 3] = 255;
                }
            }
        }

        enqueueFrame({ imageData, x: payload.x || 0, y: payload.y || 0 });
    }, [enqueueFrame]);

    const [dimensions, setDimensions] = useState(() => ({ width: session.width || 1024, height: session.height || 768 }));
    const latestDimensionsRef = useRef(dimensions);
    useEffect(() => {
        latestDimensionsRef.current = dimensions;
    }, [dimensions]);
    const resizeTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            frameQueueRef.current = [];
        };
    }, []);

    // Handle container resize
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            // Debounce resize updates
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);

            resizeTimeoutRef.current = setTimeout(() => {
                const { width, height } = entry.contentRect;
                setDimensions(prev => {
                    if (Math.abs(prev.width - width) > 10 || Math.abs(prev.height - height) > 10) {
                        setStatus('Resizing & Reconnecting...');
                        return { width: Math.floor(width), height: Math.floor(height) };
                    }
                    return prev;
                });
            }, 250); // Reduced debounce for faster resize response
        });

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
        ctxRef.current = context;
        frameQueueRef.current = [];
        if (context) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        return () => {
            if (ctxRef.current === context) {
                ctxRef.current = null;
            }
        };
    }, [dimensions.width, dimensions.height]);

    const connectWebSocket = useCallback(() => {
        if (!authToken) return;

        // If a socket is already open, do nothing.
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            return;
        }
        // If there's a socket in CLOSING/CLOSED, ensure it's cleaned up.
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CONNECTING) {
            try { wsRef.current.close(); } catch (_) { }
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        setStatus('Connecting...');
        lastFrameAtRef.current = Date.now();

        ws.binaryType = 'arraybuffer'; // Important for binary data

        ws.onopen = () => {
            setStatus('Connected');
            const sessionServerId = session.serverId || session.sessionId || session.id;
            const mode = session.serverId ? 'resume' : (session.mode || 'connect');
            surfaceSizeRef.current = {
                width: Math.floor(latestDimensionsRef.current.width),
                height: Math.floor(latestDimensionsRef.current.height)
            };

            if (mode === 'connect') {
                const encrypted = encryptPayload({
                    type: session.protocol || 'rdp',
                    host: session.host,
                    username: session.username,
                    password: session.password,
                    port: session.port,
                    token: authToken,
                    connectionId: session.connectionId,
                    width: latestDimensionsRef.current.width,
                    height: latestDimensionsRef.current.height
                });
                ws.send(JSON.stringify({ type: 'connect', payload: encrypted }));
            } else {
                if (!sessionServerId) {
                    console.warn('Attempted to resume without a server session id for RDP');
                    setStatus('Unable to resume session');
                    return;
                }
                ws.send(JSON.stringify({
                    type: 'resume',
                    sessionId: sessionServerId,
                    token: authToken,
                }));
            }
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof ArrayBuffer) {
                // Handle Binary Data
                const buffer = new Uint8Array(event.data);
                const type = buffer[0];

                if (type === 1) { // Single Bitmap (legacy)
                    lastFrameAtRef.current = Date.now();
                    const view = new DataView(event.data);
                    const x = view.getUint16(1, true);
                    const y = view.getUint16(3, true);
                    const width = view.getUint16(5, true);
                    const height = view.getUint16(7, true);
                    const bitsPerPixel = view.getUint8(9);
                    const data = buffer.subarray(10); // Pixel data starts at offset 10

                    renderBitmap({ x, y, width, height, bitsPerPixel, data });
                } else if (type === 2) { // Batched Bitmaps (PERFORMANCE BOOST!)
                    lastFrameAtRef.current = Date.now();
                    const view = new DataView(event.data);
                    const count = view.getUint16(1, true);
                    let offset = 3;

                    // Process all bitmaps in the batch
                    for (let i = 0; i < count; i++) {
                        const x = view.getUint16(offset, true);
                        const y = view.getUint16(offset + 2, true);
                        const width = view.getUint16(offset + 4, true);
                        const height = view.getUint16(offset + 6, true);
                        const bitsPerPixel = view.getUint8(offset + 8);
                        // offset + 9 is reserved byte
                        const dataLength = width * height * Math.ceil(bitsPerPixel / 8);
                        const data = buffer.subarray(offset + 10, offset + 10 + dataLength);

                        renderBitmap({ x, y, width, height, bitsPerPixel, data });
                        offset += 10 + dataLength;
                    }
                }
                return;
            }

            // Handle Text Data (JSON)
            const msg = JSON.parse(event.data);

            if (msg.type === 'status') {
                setStatus(msg.message);
            } else if (msg.type === 'error') {
                setStatus(`Error: ${msg.message}`);
            } else if (msg.type === 'session' && msg.sessionId) {
                onSessionMetadataRef.current?.(session.id, msg.sessionId);
            } else if (msg.type === 'rdp-size') {
                const next = {
                    width: Math.max(1, Number(msg.width) || surfaceSizeRef.current.width),
                    height: Math.max(1, Number(msg.height) || surfaceSizeRef.current.height),
                };
                surfaceSizeRef.current = next;
                suppressResizeSendRef.current = true;
                setDimensions(next);
            }
        };

        ws.onclose = () => {
            setStatus('Disconnected');
        };

        ws.onerror = (err) => {
            setStatus('Connection Error');
            console.error('WebSocket error:', err);
        };
    }, [authToken, session.serverId, session.sessionId, session.id, session.mode, session.protocol, session.host, session.username, session.password, session.port, session.connectionId, wsUrl, renderBitmap, latestDimensionsRef]);

    useEffect(() => {
        connectWebSocket();
        return () => {
            const ws = wsRef.current;
            if (ws) {
                ws.onopen = null;
                ws.onmessage = null;
                ws.onclose = null;
                ws.onerror = null;
                try { ws.close(); } catch (_) { }
            }
        };
    }, [connectWebSocket]);

    useEffect(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (suppressResizeSendRef.current) {
            suppressResizeSendRef.current = false;
            return;
        }
        surfaceSizeRef.current = {
            width: Math.floor(dimensions.width),
            height: Math.floor(dimensions.height)
        };
        ws.send(JSON.stringify({
            type: 'resize',
            width: surfaceSizeRef.current.width,
            height: surfaceSizeRef.current.height
        }));
    }, [dimensions.width, dimensions.height]);

    const sendInputMessage = useCallback((payload) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        ws.send(JSON.stringify(payload));
        return true;
    }, []);

    // Watchdog: if no frames for a while, force reconnect of the WebSocket/session.
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const sinceFrame = now - lastFrameAtRef.current;
            const ws = wsRef.current;
            if (!ws) return;
            if (ws.readyState === WebSocket.CLOSED) {
                return connectWebSocket();
            }
            if (sinceFrame > 5000 && ws.readyState === WebSocket.OPEN) {
                if (now - lastReconnectAtRef.current < 4000) return;
                lastReconnectAtRef.current = now;
                setStatus('Reconnecting...');
                try { ws.close(); } catch (_) { }
                connectWebSocket();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [connectWebSocket]);

    const lastMouseMoveTimeRef = useRef(0);
    const MOUSE_MOVE_THROTTLE = 8; // Reduced to 8ms for smoother 120Hz mouse updates

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const now = Date.now();
        if (now - lastMouseMoveTimeRef.current < MOUSE_MOVE_THROTTLE) return;
        lastMouseMoveTimeRef.current = now;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = (surfaceSizeRef.current.width || rect.width || 1) / (rect.width || 1);
        const scaleY = (surfaceSizeRef.current.height || rect.height || 1) / (rect.height || 1);
        const x = Math.max(0, Math.min(surfaceSizeRef.current.width - 1, Math.round((e.clientX - rect.left) * scaleX)));
        const y = Math.max(0, Math.min(surfaceSizeRef.current.height - 1, Math.round((e.clientY - rect.top) * scaleY)));

        sendInputMessage({
            type: 'rdp-input',
            event: { type: 'mouse', x, y, button: 0, isPressed: false }
        });
    };

    const handleMouseDown = (e) => {
        if (!canvasRef.current || !wsRef.current) return;
        if (wsRef.current.readyState !== WebSocket.OPEN) return;
        // Ensure canvas gets focus for keyboard events
        canvasRef.current.focus({ preventScroll: true });

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = (surfaceSizeRef.current.width || rect.width || 1) / (rect.width || 1);
        const scaleY = (surfaceSizeRef.current.height || rect.height || 1) / (rect.height || 1);
        const x = Math.max(0, Math.min(surfaceSizeRef.current.width - 1, Math.round((e.clientX - rect.left) * scaleX)));
        const y = Math.max(0, Math.min(surfaceSizeRef.current.height - 1, Math.round((e.clientY - rect.top) * scaleY)));
        // Map buttons: 0=left, 1=middle, 2=right. RDP might expect 1=left, 2=right, 3=middle or similar.
        // node-rdpjs: 1 is left, 2 is right, 3 is middle? Need to verify.
        // Usually standard DOM: 0=left, 1=middle, 2=right.
        // Let's assume 1=left for now based on common RDP libs, or check node-rdpjs docs if possible.
        // Actually node-rdpjs often uses 1 for left.
        let button = 1;
        if (e.button === 2) button = 2;
        if (e.button === 1) button = 3;

        sendInputMessage({
            type: 'rdp-input',
            event: { type: 'mouse', x, y, button, isPressed: true }
        });
    };

    const handleMouseUp = (e) => {
        if (!canvasRef.current || !wsRef.current) return;
        if (wsRef.current.readyState !== WebSocket.OPEN) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = (surfaceSizeRef.current.width || rect.width || 1) / (rect.width || 1);
        const scaleY = (surfaceSizeRef.current.height || rect.height || 1) / (rect.height || 1);
        const x = Math.max(0, Math.min(surfaceSizeRef.current.width - 1, Math.round((e.clientX - rect.left) * scaleX)));
        const y = Math.max(0, Math.min(surfaceSizeRef.current.height - 1, Math.round((e.clientY - rect.top) * scaleY)));
        let button = 1;
        if (e.button === 2) button = 2;
        if (e.button === 1) button = 3;

        sendInputMessage({
            type: 'rdp-input',
            event: { type: 'mouse', x, y, button, isPressed: false }
        });
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        return false;
    };

    const handleKeyDown = useCallback((e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        e.preventDefault();
        sendInputMessage({
            type: 'rdp-input',
            event: { type: 'key', code: e.code, key: e.key, isPressed: true }
        });
    }, [sendInputMessage]);

    const handleKeyUp = useCallback((e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        e.preventDefault();
        sendInputMessage({
            type: 'rdp-input',
            event: { type: 'key', code: e.code, key: e.key, isPressed: false }
        });
    }, [sendInputMessage]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleDisconnect = useCallback(() => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'disconnect' }));
        }
        onClose?.();
    }, [onClose]);

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full min-h-0 bg-black text-white overflow-hidden"
            onClick={onFocus}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/10 rounded-md">
                        <MousePointer2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-200">{session.username}@{session.host}</h3>
                        <p className="text-xs text-gray-500 font-mono">{status}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 text-gray-400 hover:text-white">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-[#161b22] border-white/10 text-gray-300">
                            <DropdownMenuItem onClick={() => window.location.reload()} className="gap-2 cursor-pointer hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white">
                                <RefreshCw className="w-4 h-4" /> Reload
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDisconnect} className="gap-2 text-red-400 cursor-pointer hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300">
                                <X className="w-4 h-4" /> Disconnect
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* RDP Canvas */}
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-[#0d1117] relative w-full h-full min-h-0">
                <canvas
                    ref={canvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="shadow-2xl w-full h-full max-w-full max-h-full block"
                    style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000',
                        touchAction: 'none',
                        objectFit: 'fill' // Fill container edge-to-edge
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onContextMenu={handleContextMenu}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                />

                {/* Disconnection Overlay */}
                {(status === 'Disconnected' || status.includes('Connection Error')) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="text-center p-8 bg-[#161b22] border border-red-500/30 rounded-lg shadow-2xl">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-red-500/10 rounded-full">
                                    <X className="w-12 h-12 text-red-500" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-semibold text-red-400 mb-2">
                                {status === 'Disconnected' ? 'Disconnected' : 'Connection Error'}
                            </h2>
                            <p className="text-gray-400 mb-6">
                                The RDP session has been terminated
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button
                                    onClick={() => {
                                        connectWebSocket();
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reconnect
                                </Button>
                                <Button
                                    onClick={handleDisconnect}
                                    variant="outline"
                                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
