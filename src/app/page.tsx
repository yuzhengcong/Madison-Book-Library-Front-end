"use client";

import { useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import ChatBar from "@/components/ChatBar";
import DemographicsModal from "@/components/DemographicsModal";

// 消息类型，带可选来源段落
type Msg = {
  role: "user" | "assistant";
  text: string;
  sources?: { book: string; fileId?: string; quote?: string }[];
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSurvey, setShowSurvey] = useState(true);
  const [contexts, setContexts] = useState<string[]>([]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    // 追加用户消息
    setMessages((prev) => [...prev, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, contexts }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.reply ?? "";
      const sources: { book: string; fileId?: string; quote?: string }[] = data.sources ?? [];

      setMessages((prev) => [...prev, { role: "assistant", text: reply, sources }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, something went wrong. Please try again later." },
      ]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySubmit = (_payload: { occupation: string; ageRange: string }) => {
    // 这里没有后端 demographics 接口，提交后仅关闭弹窗
    setShowSurvey(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <BrandHeader />
      <main className="mx-auto max-w-5xl px-6">
        <section className="py-24 sm:py-28">
          <h1
            className="text-center text-3xl sm:text-4xl text-black"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Ask your Madison Book Library Chatbot
          </h1>

          {/* 消息区 */}
          <div className="mt-10 space-y-6">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[80%] rounded-2xl bg-white px-5 py-4 shadow border border-zinc-200"
                    : "mr-auto max-w-[80%] rounded-2xl bg-white px-5 py-4 shadow border border-zinc-200"
                }
              >
                <p className="text-zinc-900 text-base whitespace-pre-wrap">{m.text}</p>

                {m.role === "assistant" && (
                  <div className="mt-4 pt-3 border-t border-zinc-200">
                    <div className="text-xs font-semibold text-zinc-600">Sources</div>
                    <div className="mt-1 space-y-1">
                      {(m.sources ?? []).slice(0, 5).map((s, idx) => (
                        <div key={idx} className="text-sm text-zinc-700">
                          <span className="font-medium">{s.book}</span>
                          {": "}
                          <span>
                            {s.quote && s.quote.trim().length > 0
                              ? s.quote
                              : "(citation unavailable)"}
                          </span>
                        </div>
                      ))}
                      {(!m.sources || m.sources.length === 0) && (
                        <div className="text-sm text-zinc-500">No sources available.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 底部固定输入栏 */}
          <div
            className="fixed left-0 right-0 flex justify-center px-6 pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="w-full max-w-3xl pointer-events-auto">
              <ChatBar
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onContextChange={(sel) => setContexts(sel)}
              />
              {loading && (
                <div className="mt-2 text-center text-sm text-zinc-500">Thinking…</div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 人口信息与 consent 弹窗 */}
      <DemographicsModal
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmit={handleSurveySubmit}
      />
    </div>
  );
}
