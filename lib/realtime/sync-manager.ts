import { io, Socket } from 'socket.io-client';
import { Change, DocumentSync, SyncMessage, CursorUpdate, PresenceUpdate } from './types';
import { 
    transformOperations, 
    applyChanges, 
    generateContentHash, 
    detectConflict,
    resolveConflictLWW,
    validateChange,
    getChangesSinceVersion 
} from './conflict-resolution';

interface SyncManagerConfig {
    url: string;
    docId: string;
    userId: string;
    userName: string;
    email: string;
    userColor: string;
    initialContent?: string;
}

interface SyncState {
    version: number;
    content: string;
    contentHash: string;
    pendingChanges: Change[];
    acknowledgedVersion: number;
    lastSyncTime: number;
}

function toMillis(value: Date | string): number {
    if (value instanceof Date) {
        return value.getTime();
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

export class RealtimeSyncManager {
    private socket: Socket | null = null;
    private config: SyncManagerConfig;
    private state: SyncState;
    private listeners: Map<string, Function[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectDelay = 1000;
    private syncInterval: NodeJS.Timeout | null = null;

    constructor(config: SyncManagerConfig) {
        this.config = config;
        this.state = {
            version: 0,
            content: '',
            contentHash: '',
            pendingChanges: [],
            acknowledgedVersion: 0,
            lastSyncTime: Date.now(),
        };
    }

    /**
     * Connect to real-time sync server
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.config.url, {
                    reconnection: true,
                    reconnectionDelay: this.reconnectDelay,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    transports: ['websocket', 'polling'],
                    auth: {
                        docId: this.config.docId,
                        userId: this.config.userId,
                        userName: this.config.userName,
                        email: this.config.email,
                        userColor: this.config.userColor,
                        initialContent: this.config.initialContent || '',
                    },
                });

                this.setupEventListeners();

                const timeout = setTimeout(() => {
                    if (!this.socket?.connected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);

                this.socket.on('connect', () => {
                    console.log('Connected to sync server');
                    this.reconnectAttempts = 0;
                    clearTimeout(timeout);
                    this.emit('connected');
                    resolve();
                });

                this.socket.on('connect_error', (error: Error) => {
                    console.error('Connection error:', error);
                    this.emit('connection_error', error);
                    clearTimeout(timeout);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Setup WebSocket event listeners
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        // Incoming changes from other users
        this.socket.on('change', (change: Change) => {
            this.handleRemoteChange(change);
        });

        // Sync state from server
        this.socket.on('sync-state', (syncState: Partial<DocumentSync>) => {
            this.handleSyncState(syncState);
        });

        // Presence updates
        this.socket.on('presence', (presence: PresenceUpdate) => {
            this.emit('presence', presence);
        });

        // Cursor updates
        this.socket.on('cursor', (cursor: CursorUpdate) => {
            this.emit('cursor', cursor);
        });

        // Acknowledgments
        this.socket.on('ack', (data: { version: number; changeId: string }) => {
            this.handleAck(data);
        });

        // Conflict resolution
        this.socket.on('conflict', (data: { conflictType: string; resolution: any }) => {
            this.handleConflict(data);
        });

        // Connection events
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            this.emit('disconnected', reason);
        });

        this.socket.on('reconnect', () => {
            console.log('Reconnected');
            this.reconnectAttempts = 0;
            this.fullSync();
        });

        this.socket.on('reconnect_attempt', () => {
            this.reconnectAttempts++;
            this.emit('reconnecting', this.reconnectAttempts);
        });
    }

    /**
     * Handle incoming changes from other users
     */
    private handleRemoteChange(change: Change): void {
        // Validate change
        if (!validateChange(change, this.state.content.length)) {
            console.warn('Invalid change received:', change);
            return;
        }

        // Transform against pending local changes
        const transformedChange = transformOperations(
            change,
            this.state.pendingChanges.filter(
                pc => toMillis(pc.timestamp) > toMillis(change.timestamp)
            )
        );

        // Apply change
        this.state.content = applyChanges(this.state.content, [transformedChange]);
        this.state.contentHash = generateContentHash(this.state.content);
        this.state.version++;

        this.emit('change', change);
        this.emit('content_updated', this.state.content);
    }

    /**
     * Handle sync state from server
     */
    private handleSyncState(syncState: Partial<DocumentSync>): void {
        if (syncState.version === undefined) {
            return;
        }

        if (syncState.content !== undefined) {
            this.state.content = syncState.content;
            this.state.contentHash = syncState.contentHash || generateContentHash(syncState.content);
            this.state.version = syncState.version;
            this.state.lastSyncTime = Date.now();

            this.emit('content_updated', this.state.content);
            this.emit('sync_state_updated', syncState);
            return;
        }

        if (syncState.version > this.state.version && syncState.changes) {
            const newChanges = getChangesSinceVersion(syncState.changes, this.state.acknowledgedVersion);
            for (const change of newChanges) {
                if (change.userId !== this.config.userId) {
                    this.handleRemoteChange(change);
                }
            }

            this.state.version = syncState.version;
            this.state.lastSyncTime = Date.now();
            this.emit('sync_state_updated', syncState);
        }
    }

    /**
     * Handle acknowledgment
     */
    private handleAck(data: { version: number; changeId: string }): void {
        this.state.acknowledgedVersion = data.version;
        this.state.pendingChanges = this.state.pendingChanges.filter(
            change => change.id !== data.changeId
        );
        this.emit('change_acknowledged', data);
    }

    /**
     * Handle conflicts
     */
    private handleConflict(data: { conflictType: string; resolution: any }): void {
        if (data.conflictType === 'version_mismatch') {
            this.fullSync();
        } else if (data.conflictType === 'concurrent_edit') {
            // Apply resolution strategy
            const resolution = resolveConflictLWW(
                data.resolution.local,
                data.resolution.remote
            );
            this.applyResolution(resolution);
        }
        this.emit('conflict_detected', data);
    }

    /**
     * Send change to server
     */
    async sendChange(
        operation: 'insert' | 'delete' | 'update',
        position: number,
        content: string
    ): Promise<void> {
        if (!this.socket) {
            console.warn('Socket not connected');
            return;
        }

        const change: Change = {
            id: `${Date.now()}-${Math.random()}`,
            operation,
            position,
            content,
            userId: this.config.userId,
            userName: this.config.userName,
            timestamp: new Date(),
            version: this.state.version + 1,
        };

        // Validate before sending
        if (!validateChange(change, this.state.content.length)) {
            console.error('Invalid change:', change);
            return;
        }

        // Add to pending changes
        this.state.pendingChanges.push(change);

        // Apply optimistically
        this.state.content = applyChanges(this.state.content, [change]);
        this.state.contentHash = generateContentHash(this.state.content);

        // Send to server
        this.socket.emit('change', change, (ack: any) => {
            this.handleAck({ version: change.version, changeId: change.id });
        });

        this.emit('change_sent', change);
    }

    /**
     * Update cursor position
     */
    updateCursor(position: number): void {
        if (!this.socket) return;

        const cursorUpdate: CursorUpdate = {
            userId: this.config.userId,
            userName: this.config.userName,
            position,
            color: this.config.userColor,
        };

        this.socket.emit('cursor', cursorUpdate);
    }

    /**
     * Full synchronization with server
     */
    async fullSync(): Promise<void> {
        if (!this.socket) return;

        return new Promise((resolve) => {
            this.socket?.emit('sync-request', 
                {
                    docId: this.config.docId,
                    userId: this.config.userId,
                    version: this.state.version,
                    contentHash: this.state.contentHash,
                },
                (response: DocumentSync) => {
                    this.handleSyncState(response);
                    resolve();
                }
            );
        });
    }

    /**
     * Apply resolution to pending changes
     */
    private applyResolution(resolution: Change): void {
        this.state.content = applyChanges(this.state.content, [resolution]);
        this.state.contentHash = generateContentHash(this.state.content);
        this.state.version++;
        this.emit('resolution_applied', resolution);
    }

    /**
     * Get current document content
     */
    getContent(): string {
        return this.state.content;
    }

    /**
     * Get current version
     */
    getVersion(): number {
        return this.state.version;
    }

    /**
     * Get sync state
     */
    getSyncState(): SyncState {
        return { ...this.state };
    }

    /**
     * Register event listener
     */
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    /**
     * Unregister event listener
     */
    off(event: string, callback: Function): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    private emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    /**
     * Restore document content
     */
    setContent(content: string): void {
        this.state.content = content;
        this.state.contentHash = generateContentHash(content);
        this.emit('content_updated', content);
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }

    /**
     * Check connection status
     */
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    /**
     * Get pending changes
     */
    getPendingChanges(): Change[] {
        return [...this.state.pendingChanges];
    }
}
