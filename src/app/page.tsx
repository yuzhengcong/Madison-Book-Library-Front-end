"use client";

/**
 * Main chat page
 *
 * This page hosts the chat UI: header, onboarding modal, the message
 * list, inline status placeholders (Reading / Thinking) and the chat
 * input bar. It orchestrates the client-side behavior for sending
 * messages and displaying the simulated extraction / thinking states.
 *
 * Important behaviors:
 * - Insert an assistant placeholder immediately when the user sends a
 *   message so the UI can show a 'Reading [book]' or 'Thinking…'
 *   indicator in place where the assistant answer will appear.
 * - Replace the placeholder with the actual assistant reply when the
 *   API response arrives.
 * - Show an inline feedback prompt every 3 assistant replies; the
 *   prompt is marked handled only when the user dismisses or opens
 *   the extended feedback modal.
 */
import BrandHeader from "@/components/BrandHeader";
import ChatBar from "@/components/ChatBar";
import { Onboarding } from "@/components/Onboarding";
import { FeedbackModal } from "@/components/FeedbackModal";
import { ChatMessage } from "@/components/ChatMessage";
import React, { useState, useEffect, useRef } from "react";
import { CONTEXT_OPTIONS } from "@/components/ChatBar";

type Msg = { role: "user" | "assistant"; content: string; context?: string[]; showContext?: boolean; id?: number };

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusPhase, setStatusPhase] = useState<"idle" | "reading" | "thinking">("idle");
  const [currentReadingIndex, setCurrentReadingIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const [placeholderMsgId, setPlaceholderMsgId] = useState<number | null>(null);
  const [lastFeedbackShownCount, setLastFeedbackShownCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [contexts, setContexts] = useState<string[]>([]);
  const [lastAssistantIndex, setLastAssistantIndex] = useState<number | null>(null);
  const [nextMsgId, setNextMsgId] = useState(1);

  async function handleSend() {
    const text = input.trim();
    if (!text || statusPhase !== "idle") return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    const selectedBooks = contexts || [];

    // insert assistant placeholder message (will be replaced when response arrives)
    const placeholderId = nextMsgId;
    setNextMsgId((n) => n + 1);
    const placeholderMsg: Msg = { role: "assistant", content: "", id: placeholderId };
    setMessages((m) => [...m, placeholderMsg]);
    setPlaceholderMsgId(placeholderId);

    // start phase
    if (selectedBooks.length > 0) {
      setStatusPhase("reading");
      setCurrentReadingIndex(0);
      // rotate currentReadingIndex every 1000ms
      intervalRef.current = window.setInterval(() => {
        setCurrentReadingIndex((i) => (selectedBooks.length ? (i + 1) % selectedBooks.length : 0));
      }, 1000) as unknown as number;
    } else {
      setStatusPhase("thinking");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], context: contexts }),
      });
      const data = await res.json();
      const reply = (data?.reply as string) || "";
      const ctx = Array.isArray(data?.context) ? data.context : [];

      // stop reading rotation and show thinking briefly
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }

      setStatusPhase("thinking");
      // small pause to show Thinking state
      await new Promise((r) => setTimeout(r, 500));

      // replace placeholder with actual assistant message
      setMessages((prev) => {
        const newMsgs = prev.map((msg) => {
          if (msg.id === placeholderId) {
            const assistantMsg: Msg = { role: "assistant", content: reply, context: ctx, showContext: false, id: placeholderId };
            return assistantMsg;
          }
          return msg;
        });
        setLastAssistantIndex(newMsgs.findIndex((m) => m.role === "assistant" && m.id === placeholderId));
        return newMsgs;
      });
      setPlaceholderMsgId(null);
    } catch (e) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
      // replace placeholder with failure message
      setMessages((prev) => prev.map((msg) => msg.id === placeholderId ? { role: "assistant", content: "Sorry, request failed.", id: placeholderId } : msg));
      setPlaceholderMsgId(null);
    } finally {
      setLoading(false);
      setStatusPhase("idle");
    }
  }

  // onboarding will handle consent and demographics and POST to /api/onboarding

  // No automatic feedback modal opening; inline prompt is shown on the last assistant message
  // and marked handled only when the user dismisses or opens the extended modal.

  // cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <BrandHeader />

      {showOnboarding && (
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <main className="mx-auto max-w-3xl px-6 pb-32">
        <section className="py-10">
          <h1
            className="text-center text-3xl sm:text-4xl text-black"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Ask your Madison Book Library Chatbot
          </h1>

          <div className="mt-8 space-y-3">
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const assistantCount = messages.filter((mm) => mm.role === "assistant").length;
              const showFeedbackPrompt = isLast && assistantCount > 0 && assistantCount % 3 === 0 && assistantCount !== lastFeedbackShownCount && !showOnboarding;
              const isPlaceholder = m.id !== undefined && placeholderMsgId !== null && m.id === placeholderMsgId;

              return (
                <div key={i} className={`${m.role === "user" ? "justify-end" : "justify-start"} flex`}>
                  <div className="w-full">
                    {isPlaceholder ? (
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="prose prose-sm max-w-none">
                            {statusPhase === "reading" && contexts.length > 0 ? (
                              <div className="flex items-center gap-2 text-zinc-700">
                                <svg className="animate-spin h-4 w-4 text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                <span>
                                  Reading {(() => {
                                    const id = contexts[currentReadingIndex % Math.max(1, contexts.length)];
                                    const found = CONTEXT_OPTIONS.find((o) => o.id === id);
                                    return found ? found.label : id;
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-zinc-700">
                                <svg className="animate-spin h-4 w-4 text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                <span>Thinking…</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ChatMessage
                          message={{ id: String(m.id ?? i), role: m.role as any, content: m.content }}
                          isLastAssistantMessage={m.role === "assistant" && isLast}
                          onOpenFeedback={() => setShowFeedbackModal(true)}
                          showFeedbackPrompt={showFeedbackPrompt}
                          onPromptHandled={() => setLastFeedbackShownCount(assistantCount)}
                        />

                        {m.role === "assistant" && m.context && m.context.length > 0 && (
                          <div className="mt-2 max-w-[85%]">
                            <div className="mt-3 border-t border-zinc-200 pt-3 text-sm text-zinc-700">
                              <button
                                className="text-xs text-zinc-600 underline mb-2"
                                onClick={() => {
                                  setMessages((prev) => prev.map((msg, idx) => idx === i ? { ...msg, showContext: !msg.showContext } : msg));
                                }}
                              >
                                {m.showContext ? "Hide context" : `Show context (${m.context.length})`}
                              </button>

                              {m.showContext && (
                                <div className="space-y-2">
                                  {m.context.map((c, idx) => (
                                    <div key={idx} className="whitespace-pre-wrap text-xs text-zinc-700">
                                      {c}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        conversation={messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))}
      />

      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6">
        <div className="w-full max-w-3xl">
          <ChatBar
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onContextChange={setContexts}
          />
          
        </div>
      </div>
    </div>
  );
}
