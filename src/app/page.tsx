"use client";

import { useState, useEffect } from "react";
import BrandHeader from "@/components/BrandHeader";
import ChatBar from "@/components/ChatBar";
import DemographicsModal from "@/components/DemographicsModal";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";

// 消息类型，带可选来源段落
type Msg = {
  role: "user" | "assistant";
  text: string;
  sources?: { book: string; fileId?: string; quote?: string }[];
  feedback?: { liked: boolean; disliked: boolean };
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSurvey, setShowSurvey] = useState(true);
  const [contexts, setContexts] = useState<string[]>([]);
  const [feedbackBannerVisible, setFeedbackBannerVisible] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [goingRating, setGoingRating] = useState(0);
  const [helpfulRating, setHelpfulRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

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
      const sources: { book: string; fileId?: string; quote?: string }[] | undefined = data.sources;

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

  // 重新生成当前助手回复（占位实现：基于最近的用户消息重新请求）
  const handleRegenerate = async (msgIndex: number) => {
    if (loading) return;
    // 找到该回复之前最近的用户消息
    let lastUserText = "";
    for (let i = msgIndex; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        lastUserText = messages[i].text || "";
        break;
      }
    }
    if (!lastUserText) return;

    try {
      setLoading(true);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: lastUserText, contexts }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply: string = data.reply ?? "";
      const sources: { book: string; fileId?: string; quote?: string }[] | undefined = data.sources;
      setMessages((prev) => [...prev, { role: "assistant", text: reply, sources }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 点赞/点踩交互：互斥切换
  const toggleLike = (msgIndex: number) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex || m.role !== "assistant") return m;
        const liked = !(m.feedback?.liked ?? false);
        return {
          ...m,
          feedback: { liked, disliked: liked ? false : (m.feedback?.disliked ?? false) },
        };
      })
    );
  };

  const toggleDislike = (msgIndex: number) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex || m.role !== "assistant") return m;
        const disliked = !(m.feedback?.disliked ?? false);
        return {
          ...m,
          feedback: { liked: disliked ? false : (m.feedback?.liked ?? false), disliked },
        };
      })
    );
  };

  useEffect(() => {
    const assistantCount = messages.filter((m) => m.role === "assistant").length;
    setFeedbackBannerVisible(!feedbackDismissed && assistantCount >= 3);
  }, [messages, feedbackDismissed]);

  const submitFeedback = () => {
    setFeedbackModalOpen(false);
    setGoingRating(0);
    setHelpfulRating(0);
    setFeedbackText("");
  };

  // 在最新的助手消息气泡下方显示反馈提示条
  const lastAssistantIndex = messages.reduce(
    (acc, m, idx) => (m.role === "assistant" ? idx : acc),
    -1
  );

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <BrandHeader />
      <main className="mx-auto max-w-5xl px-6">
        <section className="pt-14 sm:pt-18 pb-24 sm:pb-28">
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
                    : "mr-auto max-w-[80%]"
                }
              >
                <p className="text-zinc-900 text-base whitespace-pre-wrap">{m.text}</p>

                {m.role === "assistant" && (
                  <div className="mt-4 pt-3 border-t border-zinc-200">
                    {/* 仅在存在来源时显示 Sources */}
                    {m.sources && m.sources.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-zinc-600">Sources</div>
                        <div className="mt-1 space-y-1">
                          {m.sources.slice(0, 5).map((s, idx) => (
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
                        </div>
                      </>
                    )}

                    {/* 操作栏：仅点赞/点踩（18px，选中态蓝/红色调，纯 lucide） */}
                    <div className="mt-3 flex items-center gap-4 text-zinc-600">
                      <button
                        title="Like"
                        aria-label="Like"
                        aria-pressed={Boolean(messages[i]?.feedback?.liked)}
                        className={`rounded-xl p-2 transition-colors ${
                          messages[i]?.feedback?.liked
                            ? "bg-blue-50 text-blue-600"
                            : "hover:bg-zinc-100 hover:text-zinc-700"
                        }`}
                        onClick={() => toggleLike(i)}
                      >
                        <ThumbsUp className="h-[18px] w-[18px]" strokeWidth={2} />
                      </button>
                      <button
                        title="Dislike"
                        aria-label="Dislike"
                        aria-pressed={Boolean(messages[i]?.feedback?.disliked)}
                        className={`rounded-xl p-2 transition-colors ${
                          messages[i]?.feedback?.disliked
                            ? "bg-red-50 text-red-600"
                            : "hover:bg-zinc-100 hover:text-zinc-700"
                        }`}
                        onClick={() => toggleDislike(i)}
                      >
                      <ThumbsDown className="h-[18px] w-[18px]" strokeWidth={2} />
                      </button>
                    </div>

                    {/* 反馈提示条：固定显示在最新助手回复下方，从第三轮开始，直到用户点击 */}
                    {feedbackBannerVisible && i === lastAssistantIndex && (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between">
                        <div className="text-sm text-blue-900">Would you like to give some feedback to this conversation?</div>
                        <button
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          onClick={() => {
                            setFeedbackModalOpen(true);
                            setFeedbackBannerVisible(false);
                            setFeedbackDismissed(true);
                          }}
                        >
                          Give Feedback
                        </button>
                      </div>
                    )}
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
          {/* 底部固定反馈条已移除，改为内嵌在最新助手回复下方 */}
        </section>
      </main>

      {/* 人口信息与 consent 弹窗 */}
      <DemographicsModal
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmit={handleSurveySubmit}
      />

      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setFeedbackModalOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Provide Feedback</h2>
              <button className="text-zinc-500 hover:text-zinc-700" onClick={() => setFeedbackModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <div className="text-sm text-zinc-700">How's the conversation going?</div>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={`going-${n}`}
                    aria-label={`Rate ${n} star`}
                    className={n <= goingRating ? "text-yellow-400" : "text-zinc-300"}
                    onClick={() => setGoingRating(n)}
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" stroke="currentColor" strokeWidth="0">
                      <path d="M12 2l2.92 5.92 6.54.95-4.73 4.61 1.12 6.52L12 17.77 6.15 20.99l1.12-6.52-4.73-4.61 6.54-.95L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-zinc-700">How helpful is this conversation?</div>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={`helpful-${n}`}
                    aria-label={`Rate ${n} star helpful`}
                    className={n <= helpfulRating ? "text-yellow-400" : "text-zinc-300"}
                    onClick={() => setHelpfulRating(n)}
                  >
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" stroke="currentColor" strokeWidth="0">
                      <path d="M12 2l2.92 5.92 6.54.95-4.73 4.61 1.12 6.52L12 17.77 6.15 20.99l1.12-6.52-4.73-4.61 6.54-.95L12 2z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-zinc-700">Additional feedback (optional)</div>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="mt-2 w-full h-28 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50" onClick={() => setFeedbackModalOpen(false)}>Cancel</button>
              <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800" onClick={submitFeedback}>Submit Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
