'use client'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  fetchDocumentCursorPresence,
  saveDocumentContent,
  upsertDocumentCursor,
  updateDocumentTitleDescription,
} from '@/lib/actions/document.action';
import TopTextEditorNavbar from '../shared/topTextEditorNavbar';
import { TEXT_EDITOR_TOOLBAR_OPTIONS as TOOLBAR_OPTIONS } from "../../constants/index";
import InEditorChat from '../shared/inEditorChat';
import { MessageSquare, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import * as Y from 'yjs';

interface RemoteCursorMarker {
  userId: string;
  userName: string;
  color: string;
  left: number;
  top: number;
  height: number;
}

const PAGE_HEIGHT_PX = 11 * 96;
const PAGE_GAP_PX = 14;
const PAGE_STACK_UNIT_PX = PAGE_HEIGHT_PX + PAGE_GAP_PX;

const TextEditor = ({
  id,
  userData,
  documentData,
  revisionHistory,
}: {
  id: string;
  userData: any;
  documentData: any;
  revisionHistory?: Array<any>;
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [quill, setQuill] = useState<any>(null);
  const [docName, setDocName] = useState<string>(documentData.title);
  const [docDesc, setDocDesc] = useState<string>(documentData.description);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [cursorUsers, setCursorUsers] = useState<any[]>([]);
  const [remoteCursorMarkers, setRemoteCursorMarkers] = useState<RemoteCursorMarker[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const quillRef = useRef<any>(null);
  const messageQueueRef = useRef<any[]>([]);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPersistedContentRef = useRef('');
  const pendingPersistContentRef = useRef<string | null>(null);
  const pendingPersistRevisionMetaRef = useRef<{
    revisionKind: 'edit' | 'layout';
    authorId: string;
    authorName: string;
    label: string;
    summary: string;
  } | null>(null);
  const isPersistInFlightRef = useRef(false);
  const pendingInitialContentRef = useRef<any>(null);
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const yDocRef = useRef<Y.Doc | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const isApplyingYjsRemoteRef = useRef(false);
  const yjsSeededRef = useRef(false);
  const trySeedAfterYjsRemoteRef = useRef<(() => void) | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<any>>(revisionHistory || []);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(10);
  const historyBatchSize = 10;
  const isAdjustingPagesRef = useRef(false);

  // Keep initial server-fetched history visible immediately.
  useEffect(() => {
    setHistoryItems(revisionHistory || []);
    setHistoryVisibleCount(historyBatchSize);
  }, [revisionHistory]);

  const refreshRevisionHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const resp = await fetch(`/api/text-editor/documents/${id}/revisions`, {
        cache: 'no-store',
      });
      const payload = await resp.json();
      if (payload?.ok && Array.isArray(payload?.revisions)) {
        setHistoryItems(payload.revisions);
      }
    } catch {
      // If the API is temporarily unreachable, keep the last known history.
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!historyOpen) return;
    setHistoryVisibleCount(historyBatchSize);
    void refreshRevisionHistory();

    const interval = window.setInterval(() => {
      void refreshRevisionHistory();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [historyOpen, refreshRevisionHistory]);
  // Approx "how many blank lines" represent one page height.
  // We compute this once Quill mounts (from line-height) and then maintain a trailing blank page chunk.
  const pageBreakNewlinesRef = useRef<number>(10);
  const localUserId = useMemo(() => String(userData?._id || 'guest-user'), [userData?._id]);
  const localUserName = useMemo(() => String(userData?.name || userData?.email || 'Guest'), [userData?.email, userData?.name]);
  const localEmail = useMemo(() => String(userData?.email || ''), [userData?.email]);
  const localColor = useMemo(() => {
    let hash = 0;
    const seed = localUserId || localEmail || 'guest';
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 75%, 55%)`;
  }, [localUserId, localEmail]);

  const parseEditorData = useCallback((value: any) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'object') {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return null;
  }, []);

  const getInitialContent = useCallback(() => {
    return parseEditorData(documentData?.data);
  }, [documentData?.data, parseEditorData]);

  const applyContentToEditor = useCallback((editor: any, incoming: any) => {
    if (!editor) return;

    const parsed = parseEditorData(incoming);

    // Quill delta format
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Array.isArray((parsed as any).ops)
    ) {
      editor.setContents(parsed);
      return;
    }

    // Plain text fallback
    if (typeof parsed === 'string') {
      editor.setText(parsed);
      return;
    }

    // Safe default
    editor.setText('');
  }, [parseEditorData]);

  const applyContentToEditorPreserveSelection = useCallback((editor: any, incoming: any) => {
    if (!editor) return;

    const currentRange = typeof editor.getSelection === 'function' ? editor.getSelection() : null;
    applyContentToEditor(editor, incoming);

    if (!currentRange || typeof editor.getLength !== 'function' || typeof editor.setSelection !== 'function') {
      return;
    }

    const nextLength = Math.max(0, Number(editor.getLength() || 0));
    const safeIndex = Math.max(0, Math.min(Number(currentRange.index || 0), Math.max(0, nextLength - 1)));
    const safeLength = Math.max(0, Number(currentRange.length || 0));
    editor.setSelection(safeIndex, safeLength, 'silent');
  }, [applyContentToEditor]);

  const flushQueue = useCallback(() => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (messageQueueRef.current.length === 0) return;
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

  const getSerializedContent = useCallback((editor: any) => {
    if (!editor) return '';
    try {
      return JSON.stringify(editor.getContents());
    } catch {
      return '';
    }
  }, []);

  const encodeUint8ArrayToBase64 = useCallback((data: Uint8Array) => {
    if (typeof window === 'undefined') return '';
    let binary = '';
    for (let index = 0; index < data.length; index++) {
      binary += String.fromCharCode(data[index]);
    }
    return window.btoa(binary);
  }, []);

  const decodeBase64ToUint8Array = useCallback((encoded: string) => {
    if (typeof window === 'undefined' || !encoded) return new Uint8Array();
    const binary = window.atob(encoded);
    const array = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      array[index] = binary.charCodeAt(index);
    }
    return array;
  }, []);

  const requestYjsSync = useCallback(() => {
    const ws = socketRef.current;
    const yDoc = yDocRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !yDoc) return;

    sendMessage({
      type: 'yjs-state-vector',
      id,
      stateVector: encodeUint8ArrayToBase64(Y.encodeStateVector(yDoc)),
    });
  }, [id, sendMessage, encodeUint8ArrayToBase64]);

  const flushPersistQueue = useCallback(async () => {
    if (isPersistInFlightRef.current) return;

    const nextContent = pendingPersistContentRef.current;
    const nextRevisionMeta = pendingPersistRevisionMetaRef.current;
    if (!nextContent) return;
    if (nextContent === lastPersistedContentRef.current) {
      pendingPersistContentRef.current = null;
      pendingPersistRevisionMetaRef.current = null;
      return;
    }

    pendingPersistContentRef.current = null;
    pendingPersistRevisionMetaRef.current = null;
    isPersistInFlightRef.current = true;

    try {
      await saveDocumentContent(id, nextContent, nextRevisionMeta || undefined);
      lastPersistedContentRef.current = nextContent;
    } catch (error) {
      pendingPersistContentRef.current = nextContent;
      pendingPersistRevisionMetaRef.current = nextRevisionMeta;
    } finally {
      isPersistInFlightRef.current = false;
    }

    if (
      pendingPersistContentRef.current &&
      pendingPersistContentRef.current !== lastPersistedContentRef.current
    ) {
      void flushPersistQueue();
    }
  }, [id]);

  const schedulePersist = useCallback(
    (serializedContent: string, revisionMeta?: typeof pendingPersistRevisionMetaRef.current) => {
      pendingPersistContentRef.current = serializedContent;
      pendingPersistRevisionMetaRef.current = revisionMeta || null;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        void flushPersistQueue();
      }, 900);
    },
    [flushPersistQueue]
  );

  const connectSocket = useCallback(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_SOCKET_BACKEND_URL || 'ws://localhost:5001');
    socketRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      setIsSocketConnected(true);
      sendMessage({ type: 'get-document', id });
      flushQueue();
      requestYjsSync();
    };

    ws.onclose = () => {
      setIsSocketConnected(false);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectTimerRef.current = setTimeout(() => {
        connectSocket();
      }, 800);
    };

    ws.onerror = (event) => {
      setIsSocketConnected(false);
      console.warn('WebSocket error in text editor:', event);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const editor = quillRef.current;

      if (message.type === 'yjs-sync-update' || message.type === 'yjs-remote-update') {
        const encodedUpdate = String(message.update || '');
        if (!encodedUpdate || !yDocRef.current) return;
        const update = decodeBase64ToUint8Array(encodedUpdate);
        if (update.length === 0) return;
        Y.applyUpdate(yDocRef.current, update, 'remote-sync');
        trySeedAfterYjsRemoteRef.current?.();
      } else if (message.type === 'load-document') {
        if (!editor) {
          pendingInitialContentRef.current = message.data;
          return;
        }
        if (!yDocRef.current) {
          applyContentToEditor(editor, message.data);
        }
        editor.enable();
      } else if (message.type === 'receive-changes') {
        if (!editor) return;
        editor.updateContents(message.delta);
      } else if (message.type === 'cursor-update') {
        const incomingUserId = String(message.userId || '');
        if (!incomingUserId || incomingUserId === localUserId) return;

        setCursorUsers((previousUsers) => {
          const mergedUsers = previousUsers.filter((user: any) => String(user.userId) !== incomingUserId);
          mergedUsers.push({
            userId: incomingUserId,
            userName: String(message.userName || 'User'),
            color: String(message.color || '#2563eb'),
            cursorPosition: Number(message.cursorPosition || 0),
          });
          return mergedUsers;
        });
      }
    };

    return ws;
  }, [id, applyContentToEditor, flushQueue, sendMessage, localUserId, requestYjsSync, decodeBase64ToUint8Array]);

  useEffect(() => {
    const ws = connectSocket();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      void flushPersistQueue();
      ws.onmessage = null;
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    };
  }, [connectSocket, flushPersistQueue]);

  useEffect(() => {
    quillRef.current = quill;
  }, [quill, pageCount]);

  // Compute how many newline characters approximate one visual page height.
  // This is used only to maintain a "blank page chunk" at the end of the doc
  // so page add/remove feels like Google Docs.
  useEffect(() => {
    if (!quill) return;
    try {
      const root = quill.root as HTMLElement;
      const sample = (root.querySelector('p') as HTMLElement | null) || root;
      const cs = window.getComputedStyle(sample);
      let lineHeightPx = Number.parseFloat(cs.lineHeight || '');

      if (!Number.isFinite(lineHeightPx) || lineHeightPx <= 0) {
        const fontSizePx = Number.parseFloat(cs.fontSize || '');
        lineHeightPx =
          Number.isFinite(fontSizePx) && fontSizePx > 0 ? fontSizePx * 1.5 : 24;
      }

      const estimated = Math.floor(PAGE_HEIGHT_PX / lineHeightPx);
      pageBreakNewlinesRef.current = Math.max(10, estimated);
    } catch {
      pageBreakNewlinesRef.current = 10;
    }
  }, [quill, pageCount]);

  useEffect(() => {
    if (!quill) return;

    const yDoc = new Y.Doc();
    const yText = yDoc.getText('quill-content');

    yDocRef.current = yDoc;
    yTextRef.current = yText;
    yjsSeededRef.current = false;

    const getQuillDeltaOps = (editor: any): any[] => {
      if (!editor || typeof editor.getContents !== 'function') return [];
      try {
        const contents = editor.getContents();
        const ops = contents?.ops;
        return Array.isArray(ops) ? ops : [];
      } catch {
        return [];
      }
    };

    const yTextIsLegacyJsonQuillBlob = (text: Y.Text): boolean => {
      try {
        return text.toString().startsWith('{"ops"');
      } catch {
        return false;
      }
    };

    const trySeedYTextFromQuill = () => {
      const doc = yDocRef.current;
      const text = yTextRef.current;
      const editor = quillRef.current;
      if (!doc || !text || !editor || yjsSeededRef.current) {
        return;
      }

      const ops = getQuillDeltaOps(editor);

      if (text.length > 0) {
        if (yTextIsLegacyJsonQuillBlob(text)) {
          doc.transact(() => {
            text.delete(0, text.length);
            if (ops.length > 0) {
              text.applyDelta(ops);
            }
          }, 'migrate-json-ytext');
        }
        yjsSeededRef.current = true;
        const serialized = getSerializedContent(editor);
        if (serialized) {
          lastPersistedContentRef.current = serialized;
        }
        return;
      }

      if (ops.length === 0) {
        yjsSeededRef.current = true;
        return;
      }

      doc.transact(() => {
        text.applyDelta(ops);
      }, 'init-from-quill');

      const serializedInitial = getSerializedContent(editor);
      if (serializedInitial) {
        lastPersistedContentRef.current = serializedInitial;
      }
      yjsSeededRef.current = true;
    };

    const yTextObserver = (event: Y.YTextEvent) => {
      if (event.transaction.local) return;
      const targetEditor = quillRef.current;
      if (!targetEditor) return;

      isApplyingYjsRemoteRef.current = true;
      targetEditor.updateContents({ ops: event.delta }, 'silent');
      isApplyingYjsRemoteRef.current = false;
    };

    yText.observe(yTextObserver);

    const yDocUpdateHandler = (update: Uint8Array, origin: any) => {
      if (origin === 'remote-sync') return;
      sendMessage({
        type: 'yjs-update',
        id,
        update: encodeUint8ArrayToBase64(update),
      });
    };

    yDoc.on('update', yDocUpdateHandler);

    trySeedAfterYjsRemoteRef.current = trySeedYTextFromQuill;

    const seedTimer = setTimeout(() => {
      trySeedYTextFromQuill();
    }, 320);

    requestYjsSync();

    return () => {
      clearTimeout(seedTimer);
      trySeedAfterYjsRemoteRef.current = null;
      yText.unobserve(yTextObserver);
      yDoc.off('update', yDocUpdateHandler);
      yDoc.destroy();
      yDocRef.current = null;
      yTextRef.current = null;
      isApplyingYjsRemoteRef.current = false;
      yjsSeededRef.current = false;
    };
  }, [quill, id, sendMessage, requestYjsSync, encodeUint8ArrayToBase64, getSerializedContent]);

  useEffect(() => {
    if (!quill) return;

    const publishCursorPosition = (position: number) => {
      const safePosition = Math.max(0, Number(position || 0));

      sendMessage({
        type: 'cursor-update',
        id,
        userId: localUserId,
        userName: localUserName,
        email: localEmail,
        color: localColor,
        cursorPosition: safePosition,
      });

      if (cursorUpdateTimerRef.current) {
        clearTimeout(cursorUpdateTimerRef.current);
      }
      cursorUpdateTimerRef.current = setTimeout(() => {
        void upsertDocumentCursor(id, localUserId, localUserName, localEmail, localColor, safePosition);
      }, 120);
    };

    const maybeAdjustPages = (delta: any) => {
      const pageBreakNewlines = pageBreakNewlinesRef.current;
      if (!Number.isFinite(pageBreakNewlines) || pageBreakNewlines <= 0) return;

      const plainText = typeof quill.getText === 'function' ? quill.getText() : '';
      const trailingMatch = plainText.match(/\n*$/);
      const trailingNewlines = trailingMatch ? trailingMatch[0].length : 0;

      const len = typeof quill.getLength === 'function' ? quill.getLength() : plainText.length;

      const isDelete =
        Array.isArray(delta?.ops) && delta.ops.some((op: any) => op && typeof op.delete === 'number');

      if (isDelete) {
        return;
      }

      if (trailingNewlines < pageBreakNewlines) {
        const missing = pageBreakNewlines - trailingNewlines;
        if (missing > 0) {
          isAdjustingPagesRef.current = true;
          try {
            quill.insertText(len, '\n'.repeat(missing), 'user');
          } finally {
            isAdjustingPagesRef.current = false;
          }
        }
      }
    };

    const handler = (delta: any, oldDelta: any, source: any) => {
      if (source !== 'user') return;
      if (isApplyingYjsRemoteRef.current) return;

      if (yDocRef.current && yTextRef.current && Array.isArray(delta?.ops)) {
        yDocRef.current.transact(() => {
          yTextRef.current?.applyDelta(delta.ops);
        }, 'local-quill-change');
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const content = quill.getContents();
      const serialized = JSON.stringify(content);

      const ops = Array.isArray(delta?.ops) ? delta.ops : [];
      let insertedChars = 0;
      let deletedChars = 0;
      let hasFormatting = false;

      for (const op of ops) {
        if (!op) continue;
        if (typeof op?.insert === 'string') {
          insertedChars += op.insert.length;
        } else if (op?.insert != null) {
          insertedChars += 1;
        }
        if (typeof op?.delete === 'number') {
          deletedChars += op.delete;
        }
        if (op?.attributes && Object.keys(op.attributes).length > 0) {
          hasFormatting = true;
        }
      }

      const revisionKind: 'edit' | 'layout' = isAdjustingPagesRef.current ? 'layout' : 'edit';
      const summary = (() => {
        if (revisionKind === 'layout') return 'Layout adjustment (page formatting)';
        if (hasFormatting && insertedChars === 0 && deletedChars === 0) return 'Updated formatting';
        if (insertedChars > 0 && deletedChars === 0) return `Added ${insertedChars} characters`;
        if (deletedChars > 0 && insertedChars === 0) return `Removed ${deletedChars} characters`;
        if (insertedChars >= deletedChars) return `Refined text (${insertedChars} inserted)`;
        return `Cleaned up text (${deletedChars} removed)`;
      })();

      const label = revisionKind === 'layout' ? 'Auto page correction' : 'Smart edit';

      schedulePersist(serialized, {
        revisionKind,
        authorId: localUserId,
        authorName: localUserName,
        label,
        summary,
      });

      const range = typeof quill.getSelection === 'function' ? quill.getSelection() : null;
      if (range) {
        publishCursorPosition(Number(range.index || 0));
      }

      if (!isAdjustingPagesRef.current) {
        maybeAdjustPages(delta);
      }
    };

    const selectionHandler = (range: any, oldRange: any, source: any) => {
      if (!range || source !== 'user') return;
      publishCursorPosition(Number(range.index || 0));
    };

    quill.on('text-change', handler);
    quill.on('selection-change', selectionHandler);

    return () => {
      quill.off('text-change', handler);
      quill.off('selection-change', selectionHandler);
    };
  }, [quill, sendMessage, id, localUserId, localUserName, localEmail, localColor, schedulePersist]);

  useEffect(() => {
    if (cursorTimerRef.current) {
      clearInterval(cursorTimerRef.current);
    }

    cursorTimerRef.current = setInterval(() => {
      void fetchDocumentCursorPresence(id).then((payload) => {
        if (!payload?.ok || !Array.isArray(payload.users)) return;
        setCursorUsers(payload.users.filter((u: any) => String(u.userId) !== localUserId));
      });
    }, 600);

    return () => {
      if (cursorTimerRef.current) {
        clearInterval(cursorTimerRef.current);
      }
      if (cursorUpdateTimerRef.current) {
        clearTimeout(cursorUpdateTimerRef.current);
      }
    };
  }, [id, localUserId]);

  useEffect(() => {
    if (!quill) return;

    const computeMarkers = () => {
      const containerEl =
        typeof quill.container === 'object' && quill.container
          ? (quill.container as HTMLElement)
          : null;

      if (!containerEl) {
        setRemoteCursorMarkers([]);
        return;
      }

      const length = Math.max(0, Number(quill.getLength?.() || 0));
      const markers: RemoteCursorMarker[] = cursorUsers
        .filter((u: any) => typeof u.cursorPosition === 'number' && u.userId)
        .map((u: any) => {
          const rawIndex = Number(u.cursorPosition || 0);
          const clampedIndex = Math.max(0, Math.min(rawIndex, Math.max(0, length - 1)));
          const bounds = quill.getBounds(clampedIndex);

          return {
            userId: String(u.userId),
            userName: String(u.userName || 'User'),
            color: String(u.color || '#2563eb'),
            left: Number(bounds?.left || 0) + containerEl.offsetLeft - containerEl.scrollLeft,
            top: Number(bounds?.top || 0) + containerEl.offsetTop - containerEl.scrollTop,
            height: Math.max(16, Number(bounds?.height || 18)),
          };
        });

      setRemoteCursorMarkers(markers);
    };

    computeMarkers();

    const onTextChange = () => computeMarkers();
    quill.on('text-change', onTextChange);

    const scrollEl = scrollContainerRef.current;
    const onScroll = () => computeMarkers();
    scrollEl?.addEventListener('scroll', onScroll);

    const timer = setInterval(computeMarkers, 250);
    return () => {
      quill.off('text-change', onTextChange);
      scrollEl?.removeEventListener('scroll', onScroll);
      clearInterval(timer);
    };
  }, [quill, cursorUsers]);

  useEffect(() => {
    if (!quill) return;

    const host = scrollContainerRef.current;
    if (!host) return;

    const updatePageMeta = () => {
      const root = quill.root as HTMLElement;
      if (!root) return;

      const contentHeight = Math.max(PAGE_HEIGHT_PX, Number(root.scrollHeight || PAGE_HEIGHT_PX));
      const calculatedPageCount = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT_PX));
      setPageCount(calculatedPageCount);

      const nextCurrentPage = Math.max(
        1,
        Math.min(calculatedPageCount, Math.floor(host.scrollTop / PAGE_STACK_UNIT_PX) + 1)
      );
      setCurrentPage(nextCurrentPage);
    };

    updatePageMeta();

    const onScroll = () => {
      const nextCurrentPage = Math.max(
        1,
        Math.min(pageCount, Math.floor(host.scrollTop / PAGE_STACK_UNIT_PX) + 1)
      );
      setCurrentPage(nextCurrentPage);
    };

    const onTextChange = () => {
      updatePageMeta();
    };

    const resizeObserver = new ResizeObserver(() => {
      updatePageMeta();
    });

    resizeObserver.observe(quill.root as HTMLElement);
    host.addEventListener('scroll', onScroll);
    quill.on('text-change', onTextChange);

    return () => {
      resizeObserver.disconnect();
      host.removeEventListener('scroll', onScroll);
      quill.off('text-change', onTextChange);
    };
  }, [quill, pageCount]);

  const goToPage = useCallback((pageNumber: number) => {
    const host = scrollContainerRef.current;
    if (!host) return;

    const clampedPage = Math.max(1, Math.min(pageCount, pageNumber));
    host.scrollTo({
      top: (clampedPage - 1) * PAGE_STACK_UNIT_PX,
      behavior: 'smooth',
    });
    setCurrentPage(clampedPage);
  }, [pageCount]);

  const handleAddPage = useCallback(() => {
    if (!quill) return;

    const insertAt = Math.max(0, Number(quill.getLength?.() || 0));
    const pageBreakNewlines = pageBreakNewlinesRef.current || 10;
    quill.insertText(insertAt, '\n'.repeat(pageBreakNewlines), 'user');
    quill.setSelection(Math.max(0, insertAt + 1), 0, 'silent');

    const targetPage = pageCount + 1;
    setTimeout(() => {
      goToPage(targetPage);
    }, 40);
  }, [quill, pageCount, goToPage]);

  const wrapperRef = useCallback((wrapper: any) => {
    if (!wrapper) return;

    const initEditor = async () => {
      wrapper.innerHTML = '';
      wrapper.style.width = '100%';
      wrapper.style.height = 'auto';
      wrapper.style.overflow = 'visible';
      const editor = document.createElement('div');
      editor.className = 'w-full';
      wrapper.append(editor);

      const quillModule = await import('quill');
      const Quill = quillModule.default;

      const q = new Quill(editor, {
        theme: 'snow',
        modules: {
          toolbar: TOOLBAR_OPTIONS,
        },
      });
      const root = q.root as HTMLElement;

      root.style.height = 'auto';
      root.style.minHeight = '0';
      root.style.overflow = 'visible';

      const initialContent = getInitialContent();
      applyContentToEditor(q, initialContent);

      if (pendingInitialContentRef.current) {
        applyContentToEditor(q, pendingInitialContentRef.current);
        pendingInitialContentRef.current = null;
      }

      q.enable();
      try {
        q.keyboard.addBinding({ key: 9 }, (range: any) => {
          if (!range) return true;
          try {
            const fmt = q.getFormat(range);
            const currentIndent =
              typeof fmt?.indent === 'number' ? fmt.indent : parseInt(String(fmt?.indent ?? '0'), 10) || 0;
            const nextIndent = Math.min(10, currentIndent + 1);
            q.format('indent', nextIndent, 'user');
          } catch {
            q.insertText(range.index, '    ', 'user');
            q.setSelection(range.index + 4, 0, 'silent');
          }
          return false;
        });

        q.keyboard.addBinding({ key: 9, shiftKey: true }, (range: any) => {
          if (!range) return true;
          try {
            const fmt = q.getFormat(range);
            const currentIndent =
              typeof fmt?.indent === 'number' ? fmt.indent : parseInt(String(fmt?.indent ?? '0'), 10) || 0;
            const nextIndent = Math.max(-1, currentIndent - 1);
            q.format('indent', nextIndent, 'user');
          } catch {
            // Fallback: outdent by inserting a few spaces.
            q.insertText(range.index, '    ', 'user');
            q.setSelection(range.index + 4, 0, 'silent');
          }
          return false;
        });
      } catch {
        // If Quill keyboard API changes, we silently skip.
      }
      setQuill(q);

      const toolbar = wrapper.querySelector('.ql-toolbar');
      if (toolbar) {
        toolbar.style.color = '#fff';
      }
    };

    void initEditor();
  }, [getInitialContent, applyContentToEditor]);

  const handleTitleChange = async (e: any) => {
    const nextTitle = e.target.value;
    setDocName(nextTitle)
    await updateDocumentTitleDescription(documentData.id, nextTitle, docDesc)
  }
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  const handleDescChange = async (e: any) => {
    const nextDesc = e.target.value;
    setDocDesc(nextDesc)
    await updateDocumentTitleDescription(documentData.id, docName, nextDesc)
  }

  if (userData._id !== documentData.userId && !documentData.allowedUsers.includes(userData.email) && !documentData.isPublic) {
    return (
      <div className="w-full h-[90vh] text-red-400 font-extrabold text-heading3-bold flex justify-center items-center text-center">
        You have no access to this document or it is not publicly available! Please contact the owner!
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100vh] overflow-hidden">
      <TopTextEditorNavbar
        docName={docName}
        docDesc={docDesc}
        handleDescChange={handleDescChange}
        handleTitleChange={handleTitleChange}
        id={documentData.id}
        allowedUsers={documentData.allowedUsers}
        isPublic={documentData.isPublic}
        userData={userData}
        onOpenHistory={() => setHistoryOpen(true)}
      />
      {/* {cursorUsers.length > 0 && (
        <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-slate-50 text-xs">
          <span className="font-semibold">Cursors:</span>
          {cursorUsers.map((u: any) => (
            <span
              key={u.userId}
              className="px-2 py-1 rounded"
              style={{ backgroundColor: u.color, color: '#ffffff' }}
            >
              {u.userName}: {u.cursorPosition}
            </span>
          ))}
        </div>
      )} */}
      <section ref={scrollContainerRef} className="flex flex-1 min-h-0 overflow-y-auto">
        <div className="flex-1 min-w-0 relative">
          {/* <div className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-white backdrop-blur">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              className="rounded border border-white/15 px-2 py-1 disabled:opacity-40"
              disabled={currentPage <= 1}
            >
              Prev
            </button>
            <span>{`Page ${currentPage} / ${pageCount}`}</span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              className="rounded border border-white/15 px-2 py-1 disabled:opacity-40"
              disabled={currentPage >= pageCount}
            >
              Next
            </button>
            <button
              type="button"
              onClick={handleAddPage}
              className="rounded border border-emerald-300/40 bg-emerald-400/20 px-2 py-1"
            >
              Add Page
            </button>
          </div> */}

         <div ref={editorHostRef} className="editor-container relative z-0">
            <div ref={wrapperRef}></div>
            {remoteCursorMarkers.length > 0 && (
              <div className="pointer-events-none absolute inset-0 z-10">
                {remoteCursorMarkers.map((marker) => (
                  <div key={marker.userId}>
                    <div
                      className="absolute w-[2px]"
                      style={{
                        left: `${marker.left}px`,
                        top: `${marker.top}px`,
                        height: `${marker.height}px`,
                        backgroundColor: marker.color,
                      }}
                    />
                    <div
                      className="absolute rounded px-1 py-[1px] text-[10px] leading-4 text-white"
                      style={{
                        left: `${marker.left + 4}px`,
                        top: `${Math.max(0, marker.top - 14)}px`,
                        backgroundColor: marker.color,
                      }}
                    >
                      {marker.userName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowChatPanel(true)}
          className="fixed right-4 top-20 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-sm text-white shadow-2xl backdrop-blur hover:bg-black/80"
          aria-expanded={showChatPanel}
          aria-controls="text-editor-chat-panel"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>

        {showChatPanel && (
          <div className="fixed right-4 top-20 bottom-4 z-50 w-[360px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black-1 text-white-1">
            <div className="flex h-full flex-col" id="text-editor-chat-panel">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                {/* <div>
                  <p className="text-sm font-semibold">In-editor Chats</p>
                  <p className="text-xs opacity-70">Open only while you need it</p>
                </div> */}
                <button
                  type="button"
                  onClick={() => setShowChatPanel(false)}
                  className="rounded-full border border-white/10 p-2 hover:bg-white/10"
                  aria-label="Close chat panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <InEditorChat
                roomId={`text:${id}`}
                userId={String(userData?._id || 'guest')}
                userName={String(userData?.name || userData?.username || userData?.email || 'Guest')}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {historyOpen && (
          <div
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
          >
            <div
              className="absolute right-0 top-0 h-full w-[440px] max-w-[92vw] bg-black-1 border-l border-white/10 z-[10000] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white-1">Revision History</div>
                  <div className="text-[11px] text-white-4">
                    {historyItems.length > 0
                      ? `Showing ${Math.min(historyVisibleCount, historyItems.length)} of ${historyItems.length}`
                      : 'Saved snapshots appear here'}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/10 p-2 hover:bg-white/10"
                  aria-label="Close revision history"
                  onClick={() => setHistoryOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="h-[calc(100%-56px)] overflow-hidden p-4">
                {historyLoading ? (
                  <div className="text-sm text-white-4">Loading…</div>
                ) : historyItems.length === 0 ? (
                  <div className="text-sm text-white-4">No revisions yet.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {historyItems
                      .slice(0, historyVisibleCount)
                      .map((rev: any) => (
                        <div
                          key={rev.id}
                          className="rounded-lg border border-white/10 bg-black/20 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold text-white-2">
                                {rev.label || 'Revision'}
                              </div>
                              <div className="mt-1 text-[11px] text-white-4">
                                by {rev.authorName || 'Guest'}
                              </div>
                            </div>
                            <div className="text-[11px] text-white-4">
                              {rev.createdAt
                                ? formatDistanceToNow(new Date(rev.createdAt), {
                                  addSuffix: true,
                                })
                                : ''}
                            </div>
                          </div>

                          {rev.summary ? (
                            <div className="mt-2 text-xs text-white-3">{rev.summary}</div>
                          ) : null}
                        </div>
                      ))}
                  </div>
                )}

                {!historyLoading && historyItems.length > historyVisibleCount ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setHistoryVisibleCount((v) =>
                          Math.min(historyItems.length, v + historyBatchSize)
                        )
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white-2 hover:bg-white/10"
                    >
                      Show more
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default TextEditor;
