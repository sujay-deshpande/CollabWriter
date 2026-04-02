/**
 * Real-time Sync Module Exports
 * Main entry point for all real-time synchronization functionality
 */

// Types
export * from './types';

// Utilities
export { 
    transformOperations,
    applyChanges,
    generateContentHash,
    detectConflict,
    resolveConflictLWW,
    validateChange,
    createChange,
    compactChanges,
    getChangesSinceVersion,
    rebaseChanges,
} from './conflict-resolution';

// Sync Manager
export { RealtimeSyncManager } from './sync-manager';

// Document Sync Manager
export { 
    DocumentSyncManager,
    createDocumentSyncManager,
    type DocumentSyncConfig,
} from './document-sync';

// Hooks
export {
    useRealtimeSync,
    usePresence,
    useCursors,
    useChangeHistory,
    useSyncQueue,
    useSyncMetrics,
} from './hooks';

export type { UseRealtimeSyncOptions } from './hooks';

// Configuration
export { 
    REALTIME_CONFIG,
    getConfig,
    setConfig,
    getAllConfig,
    type RealtimeConfig,
} from './config';

// Server runtime intentionally not exported from client entrypoint.
// Use backend/realtime-server.js for socket.io server process.
