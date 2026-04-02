'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRealtimeSync } from '@/lib/realtime';
import { useUser } from '@clerk/nextjs';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';

interface CodeEditorWithSyncProps {
    projectId: string;
    initialContent?: string;
    language?: string;
    theme?: string;
    onSyncStateChange?: (syncState: any) => void;
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

/**
 * Code Editor Component with Real-time Sync
 * Example integration using Ace Editor with real-time sync
 */
export function CodeEditorWithSync({
    projectId,
    initialContent = '',
    language = 'javascript',
    theme = 'monokai',
    onSyncStateChange,
}: CodeEditorWithSyncProps) {
    const { user } = useUser();
    const editorRef = useRef<any>(null);
    const [content, setContent] = useState(initialContent);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [cursors, setCursors] = useState<Map<string, any>>(new Map());
    const [syncStatus, setSyncStatus] = useState<string>('Connecting...');
    const [pendingCount, setPendingCount] = useState(0);
    const lastContentRef = useRef(initialContent);
    const isRemoteChangeRef = useRef(false);
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
    const resolvedUserName = user?.username || 'Guest';
    const resolvedEmail = user?.emailAddresses?.[0]?.emailAddress || '';

    const {
        isConnected,
        isReconnecting,
        error,
        syncState,
        sendChange,
        updateCursor,
        getContent,
    } = useRealtimeSync({
        docId: projectId,
        userId: resolvedUserId,
        userName: resolvedUserName,
        email: resolvedEmail,
        userColor,
        onConnect: () => {
            setSyncStatus('Connected');
        },
        onDisconnect: (reason) => {
            setSyncStatus(`Disconnected: ${reason}`);
        },
        onChange: (change) => {
            // Apply remote change to editor
            isRemoteChangeRef.current = true;
            const currentContent = lastContentRef.current;
            if (change.operation === 'insert') {
                const newContent =
                    currentContent.slice(0, change.position) +
                    change.content +
                    currentContent.slice(change.position);
                setContent(newContent);
                lastContentRef.current = newContent;
            } else if (change.operation === 'delete') {
                const newContent =
                    currentContent.slice(0, change.position) +
                    currentContent.slice(change.position + change.content.length);
                setContent(newContent);
                lastContentRef.current = newContent;
            }
            setTimeout(() => {
                isRemoteChangeRef.current = false;
            }, 100);
        },
        onPresence: (presence) => {
            if (presence.action === 'join') {
                setActiveUsers((prev) => [
                    ...prev.filter((u) => u.userId !== presence.userId),
                    presence,
                ]);
            } else if (presence.action === 'leave') {
                setActiveUsers((prev) => prev.filter((u) => u.userId !== presence.userId));
                setCursors((prev) => {
                    const newMap = new Map(prev);
                    newMap.delete(presence.userId);
                    return newMap;
                });
            }
        },
        onCursor: (cursor) => {
            setCursors((prev) => {
                const newMap = new Map(prev);
                newMap.set(cursor.userId, cursor);
                return newMap;
            });
        },
    });

    // Update sync status
    useEffect(() => {
        if (isConnected) {
            setSyncStatus(`Connected (v${syncState.version})`);
        } else if (isReconnecting) {
            setSyncStatus('Reconnecting...');
        } else {
            setSyncStatus('Disconnected');
        }
        setPendingCount(syncState.pendingChanges);
        onSyncStateChange?.(syncState);
    }, [isConnected, isReconnecting, syncState, onSyncStateChange]);

    // Handle content change from editor
    const handleChange = useCallback(
        async (newContent: string) => {
            if (isRemoteChangeRef.current) {
                return;
            }

            const oldContent = lastContentRef.current;
            const diff = getSingleRangeDiff(oldContent, newContent);

            if (diff) {
                if (diff.deletedText.length > 0) {
                    await sendChange('delete', diff.position, diff.deletedText);
                }

                if (diff.insertedText.length > 0) {
                    await sendChange('insert', diff.position, diff.insertedText);
                }
            }

            setContent(newContent);
            lastContentRef.current = newContent;
        },
        [sendChange]
    );

    // Update cursor on selection change
    const handleCursorChange = useCallback(() => {
        const editor = editorRef.current;
        if (editor && editor.editor) {
            const session = editor.editor.getSession();
            const row = editor.editor.getCursorPosition().row;
            const line = session.getLine(row) || '';
            const cursorPos = editor.editor.getCursorPosition().column;
            const totalPos = session.doc.$lines.slice(0, row).join('\n').length + row + cursorPos;
            updateCursor(totalPos);
        }
    }, [updateCursor]);

    return (
        <div className="w-full h-full flex flex-col bg-monokai">
            {/* Status Bar */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            isConnected ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    />
                    <span className="text-sm font-medium text-white">{syncStatus}</span>
                </div>
                <div className="flex items-center gap-4">
                    {pendingCount > 0 && (
                        <span className="text-xs bg-yellow-900 text-yellow-200 px-2 py-1 rounded">
                            {pendingCount} pending
                        </span>
                    )}
                    {error && (
                        <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">
                            {error.message}
                        </span>
                    )}
                </div>
            </div>

            {/* Active Users */}
            {activeUsers.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-xs font-semibold text-slate-300">Active:</span>
                    {activeUsers.map((user) => (
                        <div
                            key={user.userId}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                            style={{
                                backgroundColor: user.color + '30',
                                borderLeft: `3px solid ${user.color}`,
                                color: user.color,
                            }}
                        >
                            {user.userName}
                        </div>
                    ))}
                </div>
            )}

            {/* Code Editor */}
            <div className="flex-1 overflow-hidden">
                <AceEditor
                    ref={editorRef}
                    mode={language}
                    theme={theme}
                    value={content}
                    onChange={handleChange}
                    onCursorChange={handleCursorChange}
                    width="100%"
                    height="100%"
                    fontSize={14}
                    setOptions={{
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: true,
                        enableSnippets: true,
                        showLineNumbers: true,
                        tabSize: 4,
                        useWorker: true,
                    }}
                />
            </div>

            {/* Cursor Indicators */}
            {cursors.size > 0 && (
                <div className="p-2 bg-slate-800 border-t border-slate-700 text-xs">
                    <div className="font-semibold text-slate-300 mb-1">Remote Cursors:</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(cursors.entries()).map(([userId, cursor]) => (
                            <span
                                key={userId}
                                className="px-2 py-1 rounded text-xs text-white"
                                style={{ backgroundColor: cursor.color + 'cc' }}
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

export default CodeEditorWithSync;
