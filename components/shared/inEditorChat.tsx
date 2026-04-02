"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
};

type InEditorChatProps = {
  roomId: string;
  userId: string;
  userName: string;
  title?: string;
  className?: string;
  messageInputClassName?: string;
};

const MAX_LOCAL_MESSAGES = 250;

const InEditorChat = ({
  roomId,
  userId,
  userName,
  title = "In-editor Chats",
  className = "",
  messageInputClassName = "",
}: InEditorChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(
    () => process.env.NEXT_PUBLIC_SOCKET_BACKEND_URL || "ws://localhost:5001",
    []
  );

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(
        JSON.stringify({
          type: "chat:join",
          data: {
            roomId,
            userId,
            userName,
          },
        })
      );
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data || "{}"));
      if (message?.type === "chat:history" && message?.roomId === roomId) {
        const history = Array.isArray(message.messages) ? message.messages : [];
        setMessages(history.slice(-MAX_LOCAL_MESSAGES));
      }

      if (message?.type === "chat:message" && message?.roomId === roomId && message?.message) {
        setMessages((prev) => [...prev, message.message].slice(-MAX_LOCAL_MESSAGES));
      }

      if (message?.type === "chat:presence" && message?.roomId === roomId) {
        setParticipantCount(Math.max(1, Number(message.count || 1)));
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "chat:leave",
            data: { roomId },
          })
        );
      }
      ws.close();
    };
  }, [roomId, userId, userName, wsUrl]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    const ws = socketRef.current;
    const text = messageInput.trim();
    if (!ws || ws.readyState !== WebSocket.OPEN || !text) {
      return;
    }

    ws.send(
      JSON.stringify({
        type: "chat:send",
        data: {
          roomId,
          userId,
          userName,
          text,
        },
      })
    );

    setMessageInput("");
  };

  return (
    <div className={`h-full min-h-0 flex flex-col rounded-none ${className}`}>
      <div className="shrink-0 px-4 py-3 border-b border-current/10">
        <p className="text-sm font-semibold text-inherit">{title}</p>
        <p className="text-xs opacity-70 text-inherit">
          {isConnected ? "Live" : "Reconnecting..."} . {participantCount} collaborator{participantCount > 1 ? "s" : ""}
        </p>
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs opacity-70 text-inherit">Session chat is empty. Messages are temporary and disappear when collaborators leave.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.userId === userId;
            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs border shadow-sm ${
                    isMine
                      ? "bg-current/15 border-current/25"
                      : "bg-current/8 border-current/15"
                  }`}
                >
                  <p className="opacity-80 mb-0.5 text-[11px]">{isMine ? "You" : message.userName}</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-current/10 flex gap-2">
        <input
          value={messageInput}
          onChange={(event) => setMessageInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          className={`w-full rounded-md border border-current/15 bg-transparent px-3 py-2 text-sm outline-none text-inherit placeholder:opacity-60 ${messageInputClassName}`}
          placeholder="Discuss here during collaboration..."
        />
        <button
          type="button"
          onClick={sendMessage}
          className="rounded-md px-3 py-2 text-sm border border-current/15 bg-current/10 text-inherit hover:bg-current/15"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default InEditorChat;