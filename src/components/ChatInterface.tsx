import { useState } from "react";
import { Button } from "./ui/button";
import { ChatMessage } from "./ChatMessage";
import { FeedbackModal } from "./FeedbackModal";
import BrandHeader from '@/components/BrandHeader';
import ChatBar from '@/components/ChatBar';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm Gemini, Google's most capable AI model. I'm here to help you with questions, creative writing, analysis, coding, and much more. What would you like to explore today?",
    },
    {
      id: "2",
      role: "user",
      content: "Can you explain quantum computing in simple terms?",
    },
    {
      id: "3",
      role: "assistant",
      content: "Quantum computing is a revolutionary approach to computation that harnesses the principles of quantum mechanics. Unlike classical computers that use bits (0s and 1s), quantum computers use quantum bits or 'qubits.' These qubits can exist in multiple states simultaneously through a phenomenon called superposition, and they can be interconnected through quantum entanglement. This allows quantum computers to process vast amounts of information in parallel, making them potentially much faster at solving certain complex problems like cryptography, drug discovery, and optimization challenges. However, they're extremely sensitive to environmental interference and currently require very specialized conditions to operate.",
    },
  ]);
  const [input, setInput] = useState("");
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages([...messages, userMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm a demo AI chatbot interface. In a real application, this would connect to an AI service to generate responses based on your input.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <BrandHeader />

      <main className="mx-auto max-w-3xl px-6 pb-32">
        <section className="py-10">
          <h1 className="text-center text-3xl sm:text-4xl text-black" style={{ fontFamily: "var(--font-playfair)" }}>
            Chat with Gemini
          </h1>

          <div className="mt-8 space-y-3">
            {messages.map((message, index) => {
              const isLastAssistantMessage = message.role === "assistant" && index === messages.length - 1;
              return (
                <div key={message.id} className={`${message.role === "user" ? "justify-end" : "justify-start"} flex`}>
                  <div className="w-full">
                    <ChatMessage
                      message={message}
                      isLastAssistantMessage={isLastAssistantMessage}
                      onOpenFeedback={() => setFeedbackModalOpen(true)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Fixed bottom chat bar */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6">
        <div className="w-full max-w-3xl">
          <ChatBar
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onContextChange={() => {}}
          />
          {/** keep small helper text when loading */}
          {/* loading handled in state */}
        </div>
      </div>

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        conversation={messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))}
      />
    </div>
  );
}