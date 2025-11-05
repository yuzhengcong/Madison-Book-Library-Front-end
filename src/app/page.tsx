"use client";

import BrandHeader from "@/components/BrandHeader";
import ChatBar from "@/components/ChatBar";
import DemographicsModal from "@/components/DemographicsModal";
import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSurvey, setShowSurvey] = useState(true);
  const [contexts, setContexts] = useState<string[]>([]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], context: contexts }),
      });
      const data = await res.json();
      const reply = (data?.reply as string) || "";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, request failed." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSurveySubmit(payload: { occupation: string; ageRange: string }) {
    try {
      await fetch("/api/demographics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });
    } catch (e) {
      // 忽略错误
    } finally {
      setShowSurvey(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <BrandHeader />

      <DemographicsModal
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmit={handleSurveySubmit}
      />

      <main className="mx-auto max-w-3xl px-6 pb-32">
        <section className="py-10">
          <h1
            className="text-center text-3xl sm:text-4xl text-black"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Ask your Madison Book Library Chatbot
          </h1>

          <div className="mt-8 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`${
                    m.role === "user"
                      ? "bg-white border border-zinc-200"
                      : "bg-zinc-50 border border-zinc-200"
                  } rounded-2xl px-4 py-3 text-zinc-900 shadow-sm max-w-[85%]`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 固定底部输入栏 */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6">
        <div className="w-full max-w-3xl">
          <ChatBar
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onContextChange={setContexts}
          />
          {loading && (
            <p className="mt-2 text-center text-sm text-zinc-500">Thinking…</p>
          )}
        </div>
      </div>
    </div>
  );
}
