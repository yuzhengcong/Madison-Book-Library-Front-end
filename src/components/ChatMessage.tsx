import { useState, useEffect } from "react";
/**
 * ChatMessage
 *
 * Renders a single chat message (user or assistant). For assistant
 * messages this component shows the avatar, the message content, and
 * action buttons (copy, share, thumbs up/down). It also supports an
 * inline feedback prompt that asks the user whether they'd like to
 * provide more detailed feedback about the conversation.
 *
 * Props:
 * - message: the message payload (id, role, content)
 * - isLastAssistantMessage: whether this assistant message is the
 *   most recent assistant message in the conversation (used to show
 *   the inline feedback prompt)
 * - onOpenFeedback: callback that opens the extended feedback modal
 * - showFeedbackPrompt: when true, the inline prompt will be shown
 * - onPromptHandled: called after the user dismisses the prompt or
 *   opens the extended modal (so the page can mark the prompt handled)
 */
import { Share2, Copy, RotateCw, MoreVertical, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessageProps {
  message: Message;
  isLastAssistantMessage?: boolean;
  onOpenFeedback?: () => void;
  showFeedbackPrompt?: boolean;
  onPromptHandled?: () => void;
}

export function ChatMessage({ message, isLastAssistantMessage, onOpenFeedback, showFeedbackPrompt, onPromptHandled }: ChatMessageProps) {
  const [thumbsState, setThumbsState] = useState<"up" | "down" | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(() => (showFeedbackPrompt ?? false));

  useEffect(() => {
    if (showFeedbackPrompt) setShowPrompt(true);
  }, [showFeedbackPrompt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Copied to clipboard");
  };

  const handleShare = () => {
    toast.success("Share link copied");
  };

  const handleThumbsUp = () => {
    if (thumbsState === "up") {
      setThumbsState(null);
      setShowPrompt(false);
      toast.success("Feedback removed");
      try {
        fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", type: "thumbs_up", messageId: message.id }) }).catch(() => {});
      } catch (e) {}
    } else {
      setThumbsState("up");
      setShowPrompt(true);
      toast.success("Thanks for the positive feedback!");
      try {
        fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "up", messageId: message.id, message: message.content }) }).catch(() => {});
      } catch (e) {}
    }
  };

  const handleThumbsDown = () => {
    if (thumbsState === "down") {
      setThumbsState(null);
      setShowPrompt(false);
      toast.success("Feedback removed");
      try {
        fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", type: "thumbs_down", messageId: message.id }) }).catch(() => {});
      } catch (e) {}
    } else {
      setThumbsState("down");
      setShowPrompt(true);
      toast.success("Thanks for your feedback");
      try {
        fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "down", messageId: message.id, message: message.content }) }).catch(() => {});
      } catch (e) {}
    }
  };

  // showPrompt controls whether the single-step feedback prompt is visible

  if (message.role === "user") {
    return (
      <div className="flex gap-4 justify-end">
        <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-[80%]">
          <p className="text-gray-900">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          M
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-900 whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-3">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              thumbsState === "up" 
                ? "text-blue-600 bg-blue-50" 
                : "text-gray-600"
            }`}
            onClick={handleThumbsUp}
          >
            <ThumbsUp className={`w-4 h-4 ${thumbsState === "up" ? "fill-current" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              thumbsState === "down" 
                ? "text-red-600 bg-red-50" 
                : "text-gray-600"
            }`}
            onClick={handleThumbsDown}
          >
            <ThumbsDown className={`w-4 h-4 ${thumbsState === "down" ? "fill-current" : ""}`} />
          </Button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Feedback Notification - Only show for last assistant message */}
        {isLastAssistantMessage && onOpenFeedback && (showFeedbackPrompt ?? true) && showPrompt && (
          <div className="mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-700">Would you like to give some feedback to this conversation?</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setShowPrompt(false); onPromptHandled && onPromptHandled(); }}>
                  Dismiss
                </Button>
                <Button size="sm" onClick={() => { setShowPrompt(false); onOpenFeedback && onOpenFeedback(); onPromptHandled && onPromptHandled(); }} className="bg-blue-600 hover:bg-blue-700">
                  Give Feedback
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}