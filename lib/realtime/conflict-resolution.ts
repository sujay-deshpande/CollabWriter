import crypto from 'crypto';
import { Change } from './types';

function toMillis(value: Date | string): number {
    if (value instanceof Date) {
        return value.getTime();
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Operational Transformation - Transform concurrent operations
 */
export function transformOperations(
    operation: Change,
    concurrentOps: Change[]
): Change {
    let transformedOp = { ...operation };
    const operationTime = toMillis(operation.timestamp);

    for (const concurrentOp of concurrentOps) {
        if (toMillis(concurrentOp.timestamp) > operationTime) {
            // Adjust position based on concurrent operations
            if (concurrentOp.operation === 'insert') {
                if (concurrentOp.position < transformedOp.position) {
                    transformedOp.position += concurrentOp.content.length;
                } else if (concurrentOp.position === transformedOp.position && concurrentOp.userId < operation.userId) {
                    // Tiebreaker: use userId for ordering
                    transformedOp.position += concurrentOp.content.length;
                }
            } else if (concurrentOp.operation === 'delete') {
                if (concurrentOp.position < transformedOp.position) {
                    transformedOp.position = Math.max(
                        concurrentOp.position,
                        transformedOp.position - concurrentOp.content.length
                    );
                }
            }
        }
    }

    return transformedOp;
}

/**
 * Apply changes to content in order
 */
export function applyChanges(content: string, changes: Change[]): string {
    let result = content;
    const sortedChanges = [...changes].sort((a, b) => toMillis(a.timestamp) - toMillis(b.timestamp));

    for (const change of sortedChanges) {
        try {
            if (change.operation === 'insert') {
                result = result.slice(0, change.position) + change.content + result.slice(change.position);
            } else if (change.operation === 'delete') {
                result = result.slice(0, change.position) + result.slice(change.position + change.content.length);
            } else if (change.operation === 'update') {
                result = result.slice(0, change.position) + change.content + result.slice(change.position + change.content.length);
            }
        } catch (error) {
            console.error('Error applying change:', error, change);
        }
    }

    return result;
}

/**
 * Generate content hash for change detection
 */
export function generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Detect conflicts between two versions
 */
export function detectConflict(
    currentHash: string,
    previousHash: string,
    incomingHash: string
): boolean {
    return currentHash !== previousHash && currentHash !== incomingHash;
}

/**
 * Merge conflicting changes using last-write-wins strategy
 */
export function resolveConflictLWW(
    localChange: Change,
    remoteChange: Change
): Change {
    const remoteTime = toMillis(remoteChange.timestamp);
    const localTime = toMillis(localChange.timestamp);

    if (remoteTime > localTime) {
        return remoteChange;
    } else if (remoteTime < localTime) {
        return localChange;
    } else {
        // Same timestamp, use userId as tiebreaker
        return remoteChange.userId > localChange.userId ? remoteChange : localChange;
    }
}

/**
 * Validate change integrity
 */
export function validateChange(change: Change, contentLength: number): boolean {
    if (typeof change.content !== 'string') {
        return false;
    }

    if (change.position < 0 || change.position > contentLength) {
        return false;
    }

    if (change.operation === 'delete' && change.position + change.content.length > contentLength) {
        return false;
    }

    if (['insert', 'delete', 'update'].indexOf(change.operation) === -1) {
        return false;
    }

    return true;
}

/**
 * Create a change record
 */
export function createChange(
    operation: 'insert' | 'delete' | 'update',
    position: number,
    content: string,
    userId: string,
    userName: string,
    version: number
): Change {
    return {
        id: `${Date.now()}-${Math.random()}`,
        operation,
        position,
        content,
        userId,
        userName,
        timestamp: new Date(),
        version,
    };
}

/**
 * Compact changes by removing redundant operations
 */
export function compactChanges(changes: Change[]): Change[] {
    if (changes.length === 0) return [];

    const compacted: Change[] = [];
    let lastInsertPos = -1;
    let insertedContent = '';

    for (const change of changes) {
        if (change.operation === 'insert' && lastInsertPos === change.position) {
            // Merge consecutive inserts at same position
            insertedContent += change.content;
            compacted[compacted.length - 1].content = insertedContent;
        } else {
            compacted.push(change);
            if (change.operation === 'insert') {
                lastInsertPos = change.position;
                insertedContent = change.content;
            } else {
                lastInsertPos = -1;
            }
        }
    }

    return compacted;
}

/**
 * Get changes since a specific version
 */
export function getChangesSinceVersion(allChanges: Change[], version: number): Change[] {
    return allChanges.filter(change => change.version > version);
}

/**
 * Rebase changes on top of remote changes
 */
export function rebaseChanges(
    localChanges: Change[],
    remoteChanges: Change[]
): Change[] {
    return localChanges.map(localChange => {
        const conflictingRemoteChanges = remoteChanges.filter(
            rc => toMillis(rc.timestamp) < toMillis(localChange.timestamp)
        );
        return transformOperations(localChange, conflictingRemoteChanges);
    });
}
