/**
 * Real-time Document Manager
 * Provides simplified API for managing real-time document syncing
 */

import { RealtimeSyncManager } from './sync-manager';
import { Change } from './types';

export interface DocumentSyncConfig {
    docId: string;
    userId: string;
    userName: string;
    email: string;
    userColor: string;
    initialContent?: string;
    serverUrl?: string;
}

export class DocumentSyncManager {
    private syncManager: RealtimeSyncManager;
    private debounceTimer: NodeJS.Timeout | null = null;
    private debounceDelay = 300; // ms
    private onContentChange?: (content: string) => void;
    private autoSaveInterval: NodeJS.Timeout | null = null;

    constructor(config: DocumentSyncConfig) {
        this.syncManager = new RealtimeSyncManager({
            url: config.serverUrl || 'http://localhost:3001',
            docId: config.docId,
            userId: config.userId,
            userName: config.userName,
            email: config.email,
            userColor: config.userColor,
        });

        if (config.initialContent) {
            this.syncManager.setContent(config.initialContent);
        }
    }

    /**
     * Connect to sync server
     */
    async connect(): Promise<void> {
        return await this.syncManager.connect();
    }

    /**
     * Disconnect from sync server
     */
    disconnect(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.syncManager.disconnect();
    }

    /**
     * Insert text at position
     */
    async insert(position: number, text: string): Promise<void> {
        await this.syncManager.sendChange('insert', position, text);
        this.scheduleContentChange();
    }

    /**
     * Delete text at position
     */
    async delete(position: number, length: number): Promise<void> {
        // Get the text to delete
        const content = this.syncManager.getContent();
        const textToDelete = content.substring(position, position + length);
        await this.syncManager.sendChange('delete', position, textToDelete);
        this.scheduleContentChange();
    }

    /**
     * Replace text at position
     */
    async replace(position: number, length: number, text: string): Promise<void> {
        // First delete, then insert
        await this.delete(position, length);
        await this.insert(position, text);
    }

    /**
     * Get current content
     */
    getContent(): string {
        return this.syncManager.getContent();
    }

    /**
     * Set content (used for initial load)
     */
    setContent(content: string): void {
        this.syncManager.setContent(content);
    }

    /**
     * Update cursor position
     */
    updateCursor(position: number): void {
        this.syncManager.updateCursor(position);
    }

    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            isConnected: this.syncManager.isConnected(),
            version: this.syncManager.getVersion(),
            pendingChanges: this.syncManager.getPendingChanges().length,
        };
    }

    /**
     * Register event listener
     */
    on(event: string, callback: Function): void {
        this.syncManager.on(event, callback);
    }

    /**
     * Unregister event listener
     */
    off(event: string, callback: Function): void {
        this.syncManager.off(event, callback);
    }

    /**
     * Schedule content change notification
     */
    private scheduleContentChange(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            if (this.onContentChange) {
                this.onContentChange(this.syncManager.getContent());
            }
            this.debounceTimer = null;
        }, this.debounceDelay);
    }

    /**
     * Set content change callback
     */
    onContentChangeCallback(callback: (content: string) => void): void {
        this.onContentChange = callback;
    }

    /**
     * Request full sync with server
     */
    async fullSync(): Promise<void> {
        await this.syncManager.fullSync();
    }

    /**
     * Get version number
     */
    getVersion(): number {
        return this.syncManager.getVersion();
    }

    /**
     * Check if online
     */
    isConnected(): boolean {
        return this.syncManager.isConnected();
    }

    /**
     * Get pending changes count
     */
    getPendingChangesCount(): number {
        return this.syncManager.getPendingChanges().length;
    }

    /**
     * Enable auto-save (periodic sync)
     */
    enableAutoSave(intervalMs: number = 5000): void {
        this.autoSaveInterval = setInterval(() => {
            this.fullSync().catch(err => console.error('Auto-save failed:', err));
        }, intervalMs);
    }

    /**
     * Disable auto-save
     */
    disableAutoSave(): void {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    /**
     * Handle offline operations
     */
    private offlineQueue: Change[] = [];

    async addOfflineChange(change: Change): Promise<void> {
        this.offlineQueue.push(change);
    }

    async flushOfflineQueue(): Promise<void> {
        for (const change of this.offlineQueue) {
            await this.syncManager.sendChange(change.operation, change.position, change.content);
        }
        this.offlineQueue = [];
    }
}

/**
 * Factory function for creating document sync managers
 */
export function createDocumentSyncManager(config: DocumentSyncConfig): DocumentSyncManager {
    return new DocumentSyncManager(config);
}
