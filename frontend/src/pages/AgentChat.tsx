import { useEffect, useRef } from "react";
import { MessageSquare, RotateCcw, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useAgentChat } from "@/hooks/useAgentChat";
import { usePageTitle } from "@/hooks/usePageTitle";

const SUGGESTED_QUERIES = [
  "What's the status of unit 14?",
  "Which units need immediate attention?",
  "Schedule maintenance for unit 7",
  "Compare unit 4 and unit 20",
  "What is CUSUM change-point detection?",
  "What sensors should I watch for HPC degradation?",
  "Investigate anomalies on unit 23",
  "Show me the fleet overview",
];

export default function AgentChat() {
  usePageTitle("Agent Chat");
  const {
    messages,
    isLoading,
    error,
    sessionId,
    pendingAction,
    sendMessage,
    approveAction,
    clearChat,
  } = useAgentChat();

  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the start of the newest message so the user reads top-down
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages.length]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Agent Chat</h2>
          {sessionId && (
            <span className="text-xs text-muted-foreground font-mono ml-2">
              Session: {sessionId.slice(0, 8)}…
            </span>
          )}
        </div>
        {!isEmpty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            New Chat
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isEmpty ? (
          <EmptyState onSend={sendMessage} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                ref={i === messages.length - 1 ? lastMessageRef : undefined}
              >
                <ChatMessage
                  message={msg}
                  onApprove={approveAction}
                  isLoading={isLoading}
                  isLatestApproval={
                    !!pendingAction &&
                    msg.role === "assistant" &&
                    msg.pending_action != null &&
                    i === messages.length - 1
                  }
                />
              </div>
            ))}

            {isLoading && <ThinkingIndicator />}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading || !!pendingAction}
          />
          {pendingAction && (
            <p className="text-xs text-amber-400 mt-1.5">
              Approve or reject the pending proposal before sending a new
              message.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSend }: { onSend: (msg: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">AI Diagnostic Assistant</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Ask about unit health, compare engines side-by-side, schedule
        maintenance, or ask general turbofan engineering questions. The agent
        routes to specialized sub-agents and shows tool calls transparently.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => onSend(q)}
            className="text-xs border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Thinking…
      </div>
    </div>
  );
}
