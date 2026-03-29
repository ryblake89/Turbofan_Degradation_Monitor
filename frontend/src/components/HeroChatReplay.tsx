import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, MessageSquare, RotateCcw } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import { TOOL_CARD_REGISTRY } from "@/components/ChatMessage";
import ReplayPipeline from "@/components/ReplayPipeline";
import ReplayApprovalCard from "@/components/ReplayApprovalCard";
import {
  PIPELINE_NODES,
  REPLAY_STEPS,
  TOOL_RESULTS,
  PENDING_ACTION,
  USER_TEXT,
  ASSISTANT_MSG,
  CONFIRMATION_MSG,
} from "@/data/heroReplayScript";
import type { PipelineNode } from "@/data/heroReplayScript";

// ---------------------------------------------------------------------------
// Thinking indicator with agent-specific label
// ---------------------------------------------------------------------------
function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex gap-3 animate-fadeInUp">
      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Annotation line
// ---------------------------------------------------------------------------
function Annotation({ text, faded }: { text: string; faded?: boolean }) {
  return (
    <span
      className={`hidden md:inline-block text-[10px] leading-tight transition-opacity duration-300 ${
        faded ? "text-muted-foreground/30" : "text-muted-foreground/60"
      }`}
    >
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------
export default function HeroChatReplay() {
  const [stepIndex, setStepIndex] = useState(-1); // -1 = not started
  const [typedText, setTypedText] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("");
  const [showAssistant, setShowAssistant] = useState(false);
  const [visibleToolIndices, setVisibleToolIndices] = useState<number[]>([]);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalButtonPulse, setApprovalButtonPulse] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<"approved" | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeNode, setActiveNode] = useState<PipelineNode | null>(null);
  const [completedNodes, setCompletedNodes] = useState<PipelineNode[]>([]);
  const [allComplete, setAllComplete] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [annotations, setAnnotations] = useState<{ text: string; key: number }[]>([]);
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  // Reduced motion check
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Auto-scroll inside container
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: prefersReducedMotion ? "instant" : "smooth",
      });
    }
  }, [prefersReducedMotion]);

  // ---------------------------------------------------------------------------
  // Auto-scroll after render — watches all state that adds visible content
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (stepIndex < 0) return; // not started
    scrollToBottom();
  }, [
    stepIndex,
    typedText,
    showThinking,
    showAssistant,
    visibleToolIndices,
    showApproval,
    approvalDecision,
    showConfirmation,
    scrollToBottom,
  ]);

  // ---------------------------------------------------------------------------
  // Reset for replay
  // ---------------------------------------------------------------------------
  const resetReplay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (typingRef.current) clearInterval(typingRef.current);
    setStepIndex(-1);
    setTypedText("");
    setShowThinking(false);
    setThinkingLabel("");
    setShowAssistant(false);
    setVisibleToolIndices([]);
    setShowApproval(false);
    setApprovalButtonPulse(false);
    setApprovalDecision(null);
    setShowConfirmation(false);
    setActiveNode(null);
    setCompletedNodes([]);
    setAllComplete(false);
    setShowEnd(false);
    setAnnotations([]);
    setProgress(0);
    setIsFinished(false);
    startedRef.current = false;
  }, []);

  // ---------------------------------------------------------------------------
  // Reduced motion: show final state immediately
  // ---------------------------------------------------------------------------
  const showStaticFinalState = useCallback(() => {
    setTypedText(USER_TEXT);
    setShowAssistant(true);
    setVisibleToolIndices([0, 1, 2, 3, 4, 5]);
    setShowApproval(true);
    setApprovalDecision("approved");
    setShowConfirmation(true);
    setCompletedNodes([...PIPELINE_NODES]);
    setAllComplete(false);
    setShowEnd(true);
    setProgress(100);
    setIsFinished(true);
    setAnnotations(
      REPLAY_STEPS.filter((s) => s.annotation).map((s, i) => ({
        text: s.annotation!,
        key: i,
      })),
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Step execution
  // ---------------------------------------------------------------------------
  const executeStep = useCallback(
    (idx: number) => {
      if (idx >= REPLAY_STEPS.length) return;

      const step = REPLAY_STEPS[idx];
      setStepIndex(idx);
      setProgress(((idx + 1) / REPLAY_STEPS.length) * 100);

      // Update pipeline state from step
      if (step.activeNode !== undefined) setActiveNode(step.activeNode);
      if (step.completedNodes) setCompletedNodes(step.completedNodes);

      // Push annotation
      if (step.annotation) {
        setAnnotations((prev) => [
          ...prev.map((a) => ({ ...a })),
          { text: step.annotation!, key: idx },
        ]);
      }

      switch (step.type) {
        case "user_typing": {
          setShowThinking(false);
          let charIdx = 0;
          typingRef.current = setInterval(() => {
            charIdx++;
            setTypedText(USER_TEXT.slice(0, charIdx));
            if (charIdx >= USER_TEXT.length) {
              if (typingRef.current) clearInterval(typingRef.current);
            }
          }, 35);
          break;
        }
        case "routing":
          setShowThinking(false);
          break;
        case "thinking":
          setShowThinking(true);
          setThinkingLabel(step.thinkingLabel ?? "Thinking\u2026");
          break;
        case "assistant":
          setShowThinking(false);
          setShowAssistant(true);
          break;
        case "tool_card":
          setShowThinking(false);
          if (step.toolIndex != null) {
            setVisibleToolIndices((prev) => [...prev, step.toolIndex!]);
          }
          break;
        case "approval_show":
          setShowThinking(false);
          setShowApproval(true);
          setApprovalButtonPulse(true);
          break;
        case "approval_pause":
          // Just wait — button pulse continues
          break;
        case "approval_click":
          setApprovalButtonPulse(false);
          setApprovalDecision("approved");
          break;
        case "confirmation":
          setShowConfirmation(true);
          break;
        case "completion":
          setAllComplete(true);
          // Turn off flourish after animation
          setTimeout(() => setAllComplete(false), 700);
          break;
        case "end":
          setShowEnd(true);
          setIsFinished(true);
          break;
      }

      // Schedule next step
      if (idx + 1 < REPLAY_STEPS.length) {
        timerRef.current = setTimeout(() => {
          executeStep(idx + 1);
        }, REPLAY_STEPS[idx + 1].delay);
      }
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // IntersectionObserver — start replay when visible
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          if (prefersReducedMotion) {
            showStaticFinalState();
          } else {
            // Small initial delay before first step
            timerRef.current = setTimeout(() => executeStep(0), 400);
          }
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(wrapperRef.current);

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [executeStep, prefersReducedMotion, showStaticFinalState]);

  // ---------------------------------------------------------------------------
  // Replay button handler
  // ---------------------------------------------------------------------------
  const handleReplay = () => {
    resetReplay();
    // Need a tick for state to clear, then start
    setTimeout(() => {
      startedRef.current = true;
      timerRef.current = setTimeout(() => executeStep(0), 400);
    }, 50);
  };

  // Current annotation = latest one; previous ones fade
  const latestAnnotationKey =
    annotations.length > 0 ? annotations[annotations.length - 1].key : -1;

  return (
    <div ref={wrapperRef} className="space-y-3">
      {/* Framing text */}
      <p className="text-sm text-muted-foreground">
        Watch the system process a maintenance request through 6 agent nodes:
      </p>

      {/* Replay container */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Progress bar */}
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pipeline breadcrumb */}
        <div className="border-b border-border px-3">
          <ReplayPipeline
            nodes={PIPELINE_NODES}
            activeNode={activeNode}
            completedNodes={completedNodes}
            allComplete={allComplete}
          />
        </div>

        {/* Scrollable message area — pointer-events-none to suppress links */}
        <div
          ref={containerRef}
          className="overflow-y-auto px-4 py-4 space-y-4 pointer-events-none"
          style={{ height: "520px" }}
        >
          {/* Annotations column — absolute positioned to the right */}
          <div className="relative">
            {/* User message */}
            {typedText && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <ChatMessage
                    message={{
                      role: "user",
                      content: typedText,
                      timestamp: new Date(),
                    }}
                  />
                </div>
                {/* Annotations for user/routing steps */}
                <div className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-2">
                  {annotations
                    .filter((a) => a.key <= 1)
                    .map((a) => (
                      <Annotation
                        key={a.key}
                        text={a.text}
                        faded={a.key !== latestAnnotationKey}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {showThinking && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <ThinkingIndicator label={thinkingLabel} />
                </div>
                <div className="hidden md:flex flex-col gap-1 w-48 shrink-0 pt-2">
                  {annotations
                    .filter((a) => a.key === stepIndex)
                    .map((a) => (
                      <Annotation key={a.key} text={a.text} />
                    ))}
                </div>
              </div>
            )}

            {/* Assistant message (text + badges only, no tool cards) */}
            {showAssistant && (
              <div className="animate-fadeInUp mb-4">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <ChatMessage
                      message={{ ...ASSISTANT_MSG, tool_results: [] }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tool cards — rendered separately with stagger */}
            {visibleToolIndices.length > 0 && (
              <div className="space-y-1 pt-1 mb-4">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium ml-10">
                  Tool Calls
                </span>
                {visibleToolIndices.map((toolIdx) => {
                  const tr = TOOL_RESULTS[toolIdx];
                  const Card = TOOL_CARD_REGISTRY[tr.tool];
                  // Find the step that revealed this tool to get its annotation
                  const toolStep = REPLAY_STEPS.find(
                    (s) => s.type === "tool_card" && s.toolIndex === toolIdx,
                  );

                  return (
                    <div key={toolIdx} className="flex gap-3">
                      <div className="flex-1 min-w-0 ml-10 animate-fadeInUp">
                        {Card && tr.result ? (
                          <Card result={tr.result} />
                        ) : null}
                      </div>
                      {toolStep?.annotation && (
                        <div className="hidden md:flex items-center w-48 shrink-0">
                          <Annotation
                            text={toolStep.annotation}
                            faded={
                              !annotations.some(
                                (a) =>
                                  a.text === toolStep.annotation &&
                                  a.key === latestAnnotationKey,
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Approval card */}
            {showApproval && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 min-w-0 ml-10">
                  <ReplayApprovalCard
                    action={PENDING_ACTION}
                    decision={approvalDecision}
                    buttonPulse={approvalButtonPulse}
                  />
                </div>
                <div className="hidden md:flex items-start w-48 shrink-0 pt-2">
                  {annotations
                    .filter((a) => a.text.includes("HITL"))
                    .map((a) => (
                      <Annotation
                        key={a.key}
                        text={a.text}
                        faded={a.key !== latestAnnotationKey}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Confirmation message */}
            {showConfirmation && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 min-w-0 animate-fastFadeIn">
                  <ChatMessage message={CONFIRMATION_MSG} />
                </div>
                <div className="hidden md:flex items-center w-48 shrink-0">
                  {annotations
                    .filter((a) => a.text.includes("Immutable"))
                    .map((a) => (
                      <Annotation key={a.key} text={a.text} />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End state: thesis + buttons */}
      {showEnd && (
        <div className="animate-fadeInUp text-center pt-1">
          <div className="flex justify-center gap-3">
            {isFinished && (
              <button
                onClick={handleReplay}
                className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Replay
              </button>
            )}
            <Link
              to="/chat"
              className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Explore Agent Chat
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
