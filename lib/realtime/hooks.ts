'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeSyncManager } from './sync-manager';
import { Change, PresenceUpdate, CursorUpdate } from './types';

interface UseRealtimeSyncOptions {
    docId: string;
    userId: string;
    userName: string;
    email: string;
    userColor: string;
    initialContent?: string;
    serverUrl?: string;
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onChange?: (change: Change) => void;
    onPresence?: (presence: PresenceUpdate) => void;
    onCursor?: (cursor: CursorUpdate) => void;
    onConflict?: (conflict: any) => void;
    onContentUpdate?: (content: string) => void;
}

export type { UseRealtimeSyncOptions };

export function useRealtimeSync(options: UseRealtimeSyncOptions) {
    const managerRef = useRef<RealtimeSyncManager | null>(null);
    const callbacksRef = useRef({
        onConnect: options.onConnect,
        onDisconnect: options.onDisconnect,
        onChange: options.onChange,
        onPresence: options.onPresence,
        onCursor: options.onCursor,
        onConflict: options.onConflict,
        onContentUpdate: options.onContentUpdate,
    });
    const [isConnected, setIsConnected] = useState(false);
    const [syncState, setSyncState] = useState({
        version: 0,
        pendingChanges: 0,
        lastSyncTime: Date.now(),
    });
    const [error, setError] = useState<Error | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);

    const serverUrl =
        options.serverUrl ||
        process.env.NEXT_PUBLIC_REALTIME_URL ||
        'http://localhost:5002';

    useEffect(() => {
        callbacksRef.current = {
            onConnect: options.onConnect,
            onDisconnect: options.onDisconnect,
            onChange: options.onChange,
            onPresence: options.onPresence,
            onCursor: options.onCursor,
            onConflict: options.onConflict,
            onContentUpdate: options.onContentUpdate,
        };
    }, [
        options.onConnect,
        options.onDisconnect,
        options.onChange,
        options.onPresence,
        options.onCursor,
        options.onConflict,
        options.onContentUpdate,
    ]);

    // Initialize sync manager
    useEffect(() => {
        const manager = new RealtimeSyncManager({
            url: serverUrl,
            docId: options.docId,
            userId: options.userId,
            userName: options.userName,
            email: options.email,
            userColor: options.userColor,
            initialContent: options.initialContent,
        });

        managerRef.current = manager;

        // Setup event listeners
        manager.on('connected', () => {
            setIsConnected(true);
            setIsReconnecting(false);
            setError(null);
            callbacksRef.current.onConnect?.();
        });

        manager.on('disconnected', (reason: string) => {
            setIsConnected(false);
            callbacksRef.current.onDisconnect?.(reason);
        });

        manager.on('change', (change: Change) => {
            setSyncState(prev => ({
                ...prev,
                version: change.version,
            }));
            callbacksRef.current.onChange?.(change);
        });

        manager.on('presence', (presence: PresenceUpdate) => {
            callbacksRef.current.onPresence?.(presence);
        });

        manager.on('cursor', (cursor: CursorUpdate) => {
            callbacksRef.current.onCursor?.(cursor);
        });

        manager.on('conflict_detected', (conflict: any) => {
            callbacksRef.current.onConflict?.(conflict);
        });

        manager.on('content_updated', (content: string) => {
            callbacksRef.current.onContentUpdate?.(content);
        });

        manager.on('reconnecting', (attempts: number) => {
            setIsReconnecting(true);
        });

        manager.on('connection_error', (error: Error) => {
            setError(error);
        });

        // Connect
        manager.connect().catch(err => {
            setError(err);
            console.error('Failed to connect to sync server:', err);
        });

        // Cleanup
        return () => {
            manager.disconnect();
        };
    }, [options.docId, options.userId, options.userName, options.email, options.userColor, options.initialContent, serverUrl]);

    // Update sync state
    useEffect(() => {
        const interval = setInterval(() => {
            if (managerRef.current) {
                const state = managerRef.current.getSyncState();
                setSyncState({
                    version: state.version,
                    pendingChanges: state.pendingChanges.length,
                    lastSyncTime: state.lastSyncTime,
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const sendChange = useCallback(
        (operation: 'insert' | 'delete' | 'update', position: number, content: string) => {
            managerRef.current?.sendChange(operation, position, content);
        },
        []
    );

    const updateCursor = useCallback((position: number) => {
        managerRef.current?.updateCursor(position);
    }, []);

    const fullSync = useCallback(async () => {
        await managerRef.current?.fullSync();
    }, []);

    const getContent = useCallback(() => {
        return managerRef.current?.getContent() || '';
    }, []);

    const setContent = useCallback((content: string) => {
        managerRef.current?.setContent(content);
    }, []);

    return {
        isConnected,
        isReconnecting,
        error,
        syncState,
        sendChange,
        updateCursor,
        fullSync,
        getContent,
        setContent,
        manager: managerRef.current,
    };
}

/**
 * Hook for tracking active users/presence
 */
export function usePresence(docId: string, userId: string) {
    const [activeUsers, setActiveUsers] = useState<any[]>([]);

    return { activeUsers, setActiveUsers };
}

/**
 * Hook for tracking cursor positions
 */
export function useCursors(docId: string, userId: string) {
    const [cursors, setCursors] = useState<Map<string, CursorUpdate>>(new Map());

    const updateCursor = useCallback((cursor: CursorUpdate) => {
        setCursors(prev => {
            const newMap = new Map(prev);
            newMap.set(cursor.userId, cursor);
            return newMap;
        });
    }, []);

    return { cursors, updateCursor };
}

/**
 * Hook for change history
 */
export function useChangeHistory(docId: string) {
    const [changes, setChanges] = useState<Change[]>([]);

    const addChange = useCallback((change: Change) => {
        setChanges(prev => [...prev, change]);
    }, []);

    const clearHistory = useCallback(() => {
        setChanges([]);
    }, []);

    return { changes, addChange, clearHistory };
}

/**
 * Hook for offline support and sync queue
 */
export function useSyncQueue() {
    const [queue, setQueue] = useState<Change[]>([]);
    const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const enqueue = useCallback((change: Change) => {
        setQueue(prev => [...prev, change]);
    }, []);

    const dequeue = useCallback((changeId: string) => {
        setQueue(prev => prev.filter(c => c.id !== changeId));
    }, []);

    const flush = useCallback(() => {
        const items = [...queue];
        setQueue([]);
        return items;
    }, [queue]);

    return { queue, isOnline, enqueue, dequeue, flush };
}

/**
 * Hook for sync performance monitoring
 */
export function useSyncMetrics() {
    const [metrics, setMetrics] = useState({
        messagesSent: 0,
        messagesReceived: 0,
        latency: 0,
        successRate: 0,
        conflictsResolved: 0,
        averageChangeSize: 0,
    });

    const recordMessage = useCallback((type: 'sent' | 'received') => {
        setMetrics(prev => ({
            ...prev,
            messagesSent: type === 'sent' ? prev.messagesSent + 1 : prev.messagesSent,
            messagesReceived: type === 'received' ? prev.messagesReceived + 1 : prev.messagesReceived,
        }));
    }, []);

    const recordLatency = useCallback((latency: number) => {
        setMetrics(prev => ({
            ...prev,
            latency: (prev.latency + latency) / 2,
        }));
    }, []);

    const recordConflict = useCallback(() => {
        setMetrics(prev => ({
            ...prev,
            conflictsResolved: prev.conflictsResolved + 1,
        }));
    }, []);

    return { metrics, recordMessage, recordLatency, recordConflict };
}
