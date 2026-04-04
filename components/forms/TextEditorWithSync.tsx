'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import * as Y from 'yjs';

interface TextEditorWithSyncProps {
    docId: string;
    initialContent?: string;
    onSyncStateChange?: (syncState: { connected: boolean; synced: boolean }) => void;
}

function getSingleRangeDiff(previous: string, next: string) {
    if (previous === next) {
        return null;
    }

    let start = 0;
    while (
        start < previous.length &&
        start < next.length &&
        previous[start] === next[start]
    ) {
        start++;
    }

    let previousEnd = previous.length;
    let nextEnd = next.length;
    while (
        previousEnd > start &&
        nextEnd > start &&
        previous[previousEnd - 1] === next[nextEnd - 1]
    ) {
        previousEnd--;
        nextEnd--;
    }

    return {
        position: start,
        deletedText: previous.slice(start, previousEnd),
        insertedText: next.slice(start, nextEnd),
    };
}

function resolveSocketUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_SOCKET_BACKEND_URL ||
        process.env.NEXT_PUBLIC_REALTIME_URL ||
        'ws://localhost:5001';

    if (raw.startsWith('ws://') || raw.startsWith('wss://')) {
        return raw;
    }
    if (raw.startsWith('https://')) {
        return raw.replace('https://', 'wss://');
    }
    if (raw.startsWith('http://')) {
        return raw.replace('http://', 'ws://');
    }
    return `ws://${raw}`;
}

export function TextEditorWithSync({
    docId,
    initialContent = '',
    onSyncStateChange,
}: TextEditorWithSyncProps) {
    const { user } = useUser();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [content, setContent] = useState(initialContent);
    const contentRef = useRef(initialContent);
    const [selectionStart, setSelectionStart] = useState(0);
    const [activeUsers, setActiveUsers] = useState<
        { userId: string; userName: string; color: string; email?: string }[]
    >([]);
    const [cursors, setCursors] = useState<Map<string, { userId: string; userName: string; color: string; position: number }>>(
        new Map()
    );
    const [syncStatus, setSyncStatus] = useState<string>('Connecting...');
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [hasSynced, setHasSynced] = useState(false);

    const yDocRef = useRef<Y.Doc | null>(null);
    const yTextRef = useRef<Y.Text | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const messageQueueRef = useRef<unknown[]>([]);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const destroyedRef = useRef(false);
    const yTextObserverRef = useRef<((event: Y.YTextEvent) => void) | null>(null);
    const isApplyingRemoteUpdateRef = useRef(false);
    const seededFromInitialRef = useRef(false);

    const [guestId] = useState(() => {
        if (typeof window === 'undefined') {
            return `guest-${Math.random().toString(36).slice(2, 10)}`;
        }

        const existing = window.localStorage.getItem('cw_guest_id');
        if (existing) {
            return existing;
        }

        const generated = `guest-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem('cw_guest_id', generated);
        return generated;
    });
    const userColor = useMemo(() => `hsl(${Math.random() * 360}, 70%, 60%)`, []);
    const resolvedUserId = user?.id || guestId;
    const resolvedUserName = user?.username || user?.firstName || 'Guest';
    const resolvedEmail = user?.emailAddresses?.[0]?.emailAddress || '';

    const resolvedUserIdRef = useRef(resolvedUserId);
    resolvedUserIdRef.current = resolvedUserId;

    const encodeUint8ArrayToBase64 = useCallback((data: Uint8Array) => {
        if (typeof window === 'undefined') return '';
        let binary = '';
        for (let i = 0; i < data.length; i++) {
            binary += String.fromCharCode(data[i]);
        }
        return window.btoa(binary);
    }, []);

    const decodeBase64ToUint8Array = useCallback((encoded: string) => {
        if (typeof window === 'undefined' || !encoded) return new Uint8Array();
        const binary = window.atob(encoded);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return array;
    }, []);

    const flushQueue = useCallback(() => {
        const ws = socketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        for (const msg of messageQueueRef.current) {
            ws.send(JSON.stringify(msg));
        }
        messageQueueRef.current = [];
    }, []);

    const sendMessage = useCallback(
        (payload: unknown) => {
            const ws = socketRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                messageQueueRef.current.push(payload);
                return;
            }
            ws.send(JSON.stringify(payload));
        },
        []
    );

    const requestYjsSync = useCallback(() => {
        const ws = socketRef.current;
        const yDoc = yDocRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !yDoc) return;

        sendMessage({
            type: 'yjs-state-vector',
            id: docId,
            stateVector: encodeUint8ArrayToBase64(Y.encodeStateVector(yDoc)),
        });
    }, [docId, sendMessage, encodeUint8ArrayToBase64]);

    const trySeedInitialContent = useCallback(() => {
        const yDoc = yDocRef.current;
        const yText = yTextRef.current;
        if (!yDoc || !yText || seededFromInitialRef.current) return;
        if (yText.length > 0) {
            seededFromInitialRef.current = true;
            return;
        }
        const seed = initialContent || '';
        if (!seed) {
            seededFromInitialRef.current = true;
            return;
        }
        yDoc.transact(() => {
            yText.insert(0, seed);
        }, 'seed-initial');
        seededFromInitialRef.current = true;
        const next = yText.toString();
        setContent(next);
        contentRef.current = next;
    }, [initialContent]);

    useEffect(() => {
        contentRef.current = content;
    }, [content]);

    useEffect(() => {
        onSyncStateChange?.({ connected: isSocketConnected, synced: hasSynced });
    }, [isSocketConnected, hasSynced, onSyncStateChange]);

    useEffect(() => {
        if (isSocketConnected) {
            setSyncStatus(hasSynced ? 'Live (Yjs)' : 'Syncing…');
        } else {
            setSyncStatus('Disconnected');
        }
    }, [isSocketConnected, hasSynced]);

    useEffect(() => {
        destroyedRef.current = false;

        const yDoc = new Y.Doc();
        const yText = yDoc.getText('content');

        yDocRef.current = yDoc;
        yTextRef.current = yText;
        seededFromInitialRef.current = false;

        const yDocUpdateHandler = (update: Uint8Array, origin: unknown) => {
            if (origin === 'remote-sync') return;
            sendMessage({
                type: 'yjs-update',
                id: docId,
                update: encodeUint8ArrayToBase64(update),
            });
        };
        yDoc.on('update', yDocUpdateHandler);

        const onYTextChanged = (event: Y.YTextEvent) => {
            const nextContent = yText.toString();
            if (nextContent === contentRef.current) {
                return;
            }

            if (!event.transaction.local) {
                const textareaElement = textareaRef.current;
                const previousSelectionStart = textareaElement?.selectionStart || 0;
                const previousSelectionEnd = textareaElement?.selectionEnd || 0;

                isApplyingRemoteUpdateRef.current = true;
                setContent(nextContent);
                contentRef.current = nextContent;

                requestAnimationFrame(() => {
                    const el = textareaRef.current;
                    if (el) {
                        const safeStart = Math.max(0, Math.min(previousSelectionStart, nextContent.length));
                        const safeEnd = Math.max(0, Math.min(previousSelectionEnd, nextContent.length));
                        el.setSelectionRange(safeStart, safeEnd);
                    }
                    isApplyingRemoteUpdateRef.current = false;
                });
                return;
            }

            setContent(nextContent);
            contentRef.current = nextContent;
        };

        yTextObserverRef.current = onYTextChanged;
        yText.observe(onYTextChanged);

        const openSocket = () => {
            const ws = new WebSocket(resolveSocketUrl());
            socketRef.current = ws;

            ws.onopen = () => {
                setIsSocketConnected(true);
                setHasSynced(false);
                sendMessage({ type: 'get-document', id: docId });
                flushQueue();
                requestYjsSync();
            };

            ws.onclose = () => {
                setIsSocketConnected(false);
                if (destroyedRef.current) {
                    return;
                }
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                }
                reconnectTimerRef.current = setTimeout(() => {
                    if (!destroyedRef.current) {
                        openSocket();
                    }
                }, 800);
            };

            ws.onerror = () => {
                setIsSocketConnected(false);
            };

            ws.onmessage = (event) => {
                let message: { type?: string; update?: string; id?: string; [key: string]: unknown };
                try {
                    message = JSON.parse(event.data);
                } catch {
                    return;
                }

                const currentYDoc = yDocRef.current;

                if (message.type === 'yjs-sync-update' || message.type === 'yjs-remote-update') {
                    const encodedUpdate = String(message.update || '');
                    if (!encodedUpdate || !currentYDoc) return;
                    const update = decodeBase64ToUint8Array(encodedUpdate);
                    if (update.length === 0) return;
                    Y.applyUpdate(currentYDoc, update, 'remote-sync');
                    setHasSynced(true);
                    trySeedInitialContent();
                    return;
                }

                if (message.type === 'cursor-update') {
                    const incomingUserId = String(message.userId || '');
                    const localId = resolvedUserIdRef.current;
                    if (!incomingUserId || incomingUserId === localId) return;

                    setCursors((prev) => {
                        const next = new Map(prev);
                        next.set(incomingUserId, {
                            userId: incomingUserId,
                            userName: String(message.userName || 'User'),
                            color: String(message.color || '#64748b'),
                            position: Number(message.cursorPosition || 0),
                        });
                        return next;
                    });

                    setActiveUsers((prev) => {
                        const filtered = prev.filter((u) => u.userId !== incomingUserId);
                        return [
                            ...filtered,
                            {
                                userId: incomingUserId,
                                userName: String(message.userName || 'User'),
                                color: String(message.color || '#64748b'),
                                email: String(message.email || ''),
                            },
                        ];
                    });
                }
            };

            return ws;
        };

        const ws = openSocket();

        const seedTimer = window.setTimeout(() => {
            trySeedInitialContent();
            requestYjsSync();
            setHasSynced(true);
        }, 200);

        return () => {
            destroyedRef.current = true;
            window.clearTimeout(seedTimer);
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            yDoc.off('update', yDocUpdateHandler);
            if (yTextObserverRef.current) {
                yText.unobserve(yTextObserverRef.current);
                yTextObserverRef.current = null;
            }
            yDoc.destroy();
            yDocRef.current = null;
            yTextRef.current = null;
            isApplyingRemoteUpdateRef.current = false;
            seededFromInitialRef.current = false;

            ws.onmessage = null;
            ws.onopen = null;
            ws.onclose = null;
            ws.onerror = null;
            ws.close();
            socketRef.current = null;
        };
    }, [
        docId,
        encodeUint8ArrayToBase64,
        sendMessage,
        flushQueue,
        trySeedInitialContent,
        requestYjsSync,
        decodeBase64ToUint8Array,
    ]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newContent = e.target.value;
            const oldContent = contentRef.current;

            if (isApplyingRemoteUpdateRef.current) {
                return;
            }

            const diff = getSingleRangeDiff(oldContent, newContent);

            const diffRebuildsNewContent = diff && diff.position >= 0 && diff.position <= oldContent.length && diff.position + diff.deletedText.length <= oldContent.length && oldContent.slice(0, diff.position) + diff.insertedText + oldContent.slice(diff.position + diff.deletedText.length) === newContent;

            if (diffRebuildsNewContent && yDocRef.current && yTextRef.current) {
                yDocRef.current.transact(() => {
                    if (diff.deletedText.length > 0) {
                        yTextRef.current?.delete(diff.position, diff.deletedText.length);
                    }
                    if (diff.insertedText.length > 0) {
                        yTextRef.current?.insert(diff.position, diff.insertedText);
                    }
                }, 'local-input');
            }

            setContent(newContent);
            contentRef.current = newContent;
            setSelectionStart(e.currentTarget.selectionStart || 0);
        },
        []
    );

    const publishCursor = useCallback(
        (position: number) => {
            sendMessage({
                type: 'cursor-update',
                id: docId,
                userId: resolvedUserId,
                userName: resolvedUserName,
                email: resolvedEmail,
                color: userColor,
                cursorPosition: Math.max(0, position),
            });
        },
        [docId, sendMessage, resolvedUserId, resolvedUserName, resolvedEmail, userColor]
    );

    const handleCursorMove = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
        const position = (e.target as HTMLTextAreaElement).selectionStart || 0;
        setSelectionStart(position);
        publishCursor(position);
    };

    useEffect(() => {
        if (!isSocketConnected) return;
        publishCursor(selectionStart);
    }, [selectionStart, isSocketConnected, publishCursor]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between p-2 bg-slate-100 border-b border-slate-300">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            isSocketConnected ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    />
                    <span className="text-sm font-medium">{syncStatus}</span>
                </div>
            </div>

            {activeUsers.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-slate-50 border-b border-slate-200">
                    <span className="text-xs font-semibold">Active:</span>
                    {activeUsers.map((u) => (
                        <div
                            key={u.userId}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-200 text-xs"
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: u.color }}
                            />
                            {u.userName}
                        </div>
                    ))}
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onClick={handleCursorMove}
                onKeyUp={handleCursorMove}
                className="flex-1 p-4 font-mono text-sm border-none resize-none focus:outline-none"
                placeholder="Start typing..."
            />

            {cursors.size > 0 && (
                <div className="p-2 bg-slate-50 border-t border-slate-200 text-xs">
                    <div className="font-semibold mb-1">Other cursors:</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(cursors.entries()).map(([userId, cursor]) => (
                            <span
                                key={userId}
                                className="px-2 py-1 rounded text-xs"
                                style={{
                                    backgroundColor: cursor.color,
                                    color: 'white',
                                }}
                            >
                                {cursor.userName}: {cursor.position}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TextEditorWithSync;
