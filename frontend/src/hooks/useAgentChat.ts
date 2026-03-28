import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "@/api/client";
import type { PendingAction, ToolResult } from "@/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  unit_id?: number | null;
  tool_results?: ToolResult[];
  pending_action?: PendingAction | null;
  trace_id?: number | null;
  timestamp: Date;
}

export interface UseAgentChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  pendingAction: PendingAction | null;
  sendMessage: (message: string) => Promise<void>;
  approveAction: (approved: boolean) => Promise<void>;
  clearChat: () => void;
}

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const sessionIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setError(null);

    // Optimistic: add user message immediately
    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await api.chat(trimmed, sessionIdRef.current ?? undefined);
      sessionIdRef.current = res.session_id;

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.response,
        intent: res.intent,
        unit_id: res.unit_id,
        tool_results: res.tool_results,
        pending_action: res.pending_action,
        trace_id: res.trace_id,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (res.requires_approval && res.pending_action) {
        setPendingAction(res.pending_action);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          "You must approve or reject the pending maintenance proposal before sending a new message.",
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to send message.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveAction = useCallback(async (approved: boolean) => {
    if (!sessionIdRef.current) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.approve(sessionIdRef.current, approved);

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.response,
        intent: res.intent,
        unit_id: res.unit_id,
        tool_results: res.tool_results,
        trace_id: res.trace_id,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setPendingAction(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process approval.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setError(null);
    setPendingAction(null);
    sessionIdRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId: sessionIdRef.current,
    pendingAction,
    sendMessage,
    approveAction,
    clearChat,
  };
}
