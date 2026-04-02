import { Server as HTTPServer } from 'http';
import { Change, DocumentSync, PresenceUpdate } from '@/lib/realtime/types';
import {
    transformOperations,
    applyChanges,
    generateContentHash,
    detectConflict,
    resolveConflictLWW,
    validateChange,
    compactChanges,
    getChangesSinceVersion,
} from '@/lib/realtime/conflict-resolution';
import Document from '@/lib/models/document.model';
import { connectToDB } from '@/lib/mongoose';

interface DocumentRoom {
    docId: string;
    version: number;
    content: string;
    contentHash: string;
    changes: Change[];
    activeUsers: Map<string, any>;
    lastModified: Date;
}

class RealtimeSyncServer {
    private io: any;
    private rooms: Map<string, DocumentRoom> = new Map();
    private userSockets: Map<string, any> = new Map();

    constructor(httpServer: HTTPServer) {
        // Dynamically import socket.io to avoid import issues
        const SocketIO = require('socket.io').Server;
        this.io = new SocketIO(httpServer, {
            cors: {
                origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
            },
            transports: ['websocket', 'polling'],
        });

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    /**
     * Setup authentication middleware
     */
    private setupMiddleware(): void {
        this.io.use((socket: any, next: any) => {
            try {
                const { docId, userId, userName, email, userColor } = socket.handshake.auth || {};

                if (!docId) {
                    return next(new Error('Missing required authentication fields'));
                }

                const resolvedUserId =
                    typeof userId === 'string' && userId.trim().length > 0
                        ? userId
                        : `guest-${socket.id}`;
                const resolvedUserName =
                    typeof userName === 'string' && userName.trim().length > 0
                        ? userName
                        : 'Guest';

                socket.data = {
                    docId,
                    userId: resolvedUserId,
                    userName: resolvedUserName,
                    email: typeof email === 'string' ? email : '',
                    userColor:
                        typeof userColor === 'string' && userColor.trim().length > 0
                            ? userColor
                            : '#2563eb',
                };

                next();
            } catch (error) {
                next(new Error('Authentication failed'));
            }
        });
    }

    /**
     * Setup socket event handlers
     */
    private setupEventHandlers(): void {
        this.io.on('connection', (socket: any) => {
            const { docId, userId, userName, email, userColor } = socket.data;

            console.log(`User ${userName} connected to document ${docId}`);

            // Join document room
            socket.join(docId);
            this.userSockets.set(userId, socket);

            // Load or create document room
            this.loadOrCreateRoom(docId).then(() => {
                const room = this.rooms.get(docId)!;

                // Add user to active users
                room.activeUsers.set(userId, {
                    userId,
                    userName,
                    email,
                    color: userColor,
                    cursorPosition: 0,
                    lastActive: new Date(),
                });

                // Send sync state to newly connected user
                socket.emit('sync-state', this.getRoomState(docId));

                // Notify others of presence
                this.io.to(docId).emit('presence', {
                    userId,
                    userName,
                    email,
                    action: 'join',
                    color: userColor,
                });
            });

            // Handle incoming changes
            socket.on('change', async (change: Change, callback: any) => {
                try {
                    await this.handleChange(docId, userId, change);
                    const room = this.rooms.get(docId);
                    callback({ version: room?.version || change.version, changeId: change.id });
                    
                    // Broadcast to other users
                    if (room && room.changes.length > 0) {
                        socket.to(docId).emit('change', room.changes[room.changes.length - 1]);
                    }
                } catch (error) {
                    console.error('Error handling change:', error);
                    callback(new Error('Failed to apply change'));
                }
            });

            // Handle sync requests
            socket.on('sync-request', async (data: any, callback: any) => {
                try {
                    const syncState = await this.getSyncState(docId, data.version);
                    callback(syncState);
                } catch (error) {
                    console.error('Error in sync-request:', error);
                    callback(null);
                }
            });

            // Handle cursor updates
            socket.on('cursor', (cursorData: any) => {
                const room = this.rooms.get(docId);
                if (room) {
                    const user = room.activeUsers.get(userId);
                    if (user) {
                        user.cursorPosition = cursorData.position;
                    }
                }
                socket.to(docId).emit('cursor', cursorData);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const room = this.rooms.get(docId);
                if (room) {
                    room.activeUsers.delete(userId);

                    // Notify others of presence
                    this.io.to(docId).emit('presence', {
                        userId,
                        userName,
                        email,
                        action: 'leave',
                        color: userColor,
                    });

                    // Save document if needed
                    if (room.activeUsers.size === 0) {
                        this.saveDocument(docId);
                    }
                }

                this.userSockets.delete(userId);
                console.log(`User ${userName} disconnected from document ${docId}`);
            });

            // Handle errors
            socket.on('error', (error: any) => {
                console.error(`Error in socket ${socket.id}:`, error);
            });
        });
    }

    /**
     * Load or create a document room
     */
    private async loadOrCreateRoom(docId: string): Promise<void> {
        if (this.rooms.has(docId)) {
            return;
        }

        try {
            await connectToDB();
            const doc = await Document.findOne({ id: docId });

            if (doc) {
                this.rooms.set(docId, {
                    docId,
                    version: doc.version || 0,
                    content: doc.data || '',
                    contentHash: generateContentHash(doc.data || ''),
                    changes: doc.changes || [],
                    activeUsers: new Map(),
                    lastModified: doc.lastModified || new Date(),
                });
            } else {
                this.rooms.set(docId, {
                    docId,
                    version: 0,
                    content: '',
                    contentHash: generateContentHash(''),
                    changes: [],
                    activeUsers: new Map(),
                    lastModified: new Date(),
                });
            }
        } catch (error) {
            console.error('Error loading document:', error);
            // Create empty room on error
            this.rooms.set(docId, {
                docId,
                version: 0,
                content: '',
                contentHash: generateContentHash(''),
                changes: [],
                activeUsers: new Map(),
                lastModified: new Date(),
            });
        }
    }

    /**
     * Handle incoming change
     */
    private async handleChange(docId: string, userId: string, change: Change): Promise<void> {
        const room = this.rooms.get(docId);
        if (!room) {
            throw new Error('Document room not found');
        }

        const normalizedChange: Change = {
            ...change,
            timestamp: new Date(change.timestamp),
        };

        // Validate change
        if (!validateChange(normalizedChange, room.content.length)) {
            throw new Error('Invalid change');
        }

        // Transform against concurrent changes
        let transformedChange = { ...normalizedChange };
        const concurrentChanges = room.changes.filter(
            c => c.timestamp < normalizedChange.timestamp && c.userId !== userId
        );

        for (const concurrent of concurrentChanges) {
            transformedChange = transformOperations(transformedChange, [concurrent]);
        }

        // Apply change
        room.content = applyChanges(room.content, [transformedChange]);
        room.contentHash = generateContentHash(room.content);
        room.version++;
        transformedChange.version = room.version;
        transformedChange.timestamp = new Date();
        room.changes.push(transformedChange);
        room.lastModified = new Date();

        // Compact changes if too many
        if (room.changes.length > 1000) {
            room.changes = compactChanges(room.changes);
        }

        // Update active user's last modified
        const user = room.activeUsers.get(userId);
        if (user) {
            user.lastActive = new Date();
        }

        // Save periodically
        if (room.version % 10 === 0) {
            this.saveDocument(docId);
        }
    }

    /**
     * Get room state
     */
    private getRoomState(docId: string): DocumentSync | null {
        const room = this.rooms.get(docId);
        if (!room) return null;

        return {
            docId,
            content: room.content,
            version: room.version,
            lastModified: room.lastModified,
            lastModifiedBy: '',
            contentHash: room.contentHash,
            activeUsers: Array.from(room.activeUsers.values()),
            changes: room.changes,
        };
    }

    /**
     * Get sync state for a specific version
     */
    private async getSyncState(docId: string, sinceVersion: number): Promise<DocumentSync | null> {
        const room = this.rooms.get(docId);
        if (!room) return null;

        const changesSince = getChangesSinceVersion(room.changes, sinceVersion);

        return {
            docId,
            content: room.content,
            version: room.version,
            lastModified: room.lastModified,
            lastModifiedBy: '',
            contentHash: room.contentHash,
            activeUsers: Array.from(room.activeUsers.values()),
            changes: changesSince,
        };
    }

    /**
     * Save document to database
     */
    private async saveDocument(docId: string): Promise<void> {
        const room = this.rooms.get(docId);
        if (!room) return;

        try {
            await connectToDB();
            await Document.findOneAndUpdate(
                { id: docId },
                {
                    data: room.content,
                    version: room.version,
                    changes: room.changes,
                    lastModified: room.lastModified,
                    contentHash: room.contentHash,
                    updatedAt: new Date(),
                },
                { new: true }
            );
            console.log(`Document ${docId} saved. Version: ${room.version}`);
        } catch (error) {
            console.error('Error saving document:', error);
        }
    }

    /**
     * Get IO instance
     */
    getIO(): any {
        return this.io;
    }
}

export default RealtimeSyncServer;
