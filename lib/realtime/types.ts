export interface User {
    userId: string;
    userName: string;
    email: string;
    color: string;
    cursorPosition: number;
    lastActive: Date;
}

export interface Change {
    id: string;
    operation: 'insert' | 'delete' | 'update';
    position: number;
    content: string;
    userId: string;
    userName: string;
    timestamp: Date;
    version: number;
}

export interface DocumentSync {
    docId: string;
    content: string;
    version: number;
    lastModified: Date;
    lastModifiedBy: string;
    contentHash: string;
    activeUsers: User[];
    changes: Change[];
}

export interface SyncMessage {
    type: 'change' | 'presence' | 'cursor' | 'sync-request' | 'sync-response' | 'ack';
    docId: string;
    userId: string;
    userName: string;
    data: any;
    timestamp: Date;
    version?: number;
}

export interface CursorUpdate {
    userId: string;
    userName: string;
    position: number;
    color: string;
}

export interface PresenceUpdate {
    userId: string;
    userName: string;
    email: string;
    action: 'join' | 'leave';
    color: string;
}

export interface ConflictResolution {
    strategy: 'last-write-wins' | 'operational-transform' | 'crdt';
    version: number;
    resolution: any;
}
