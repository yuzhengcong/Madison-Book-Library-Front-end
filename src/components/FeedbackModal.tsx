import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation?: { role: string; content: string }[];
}

export function FeedbackModal({ isOpen, onClose, conversation }: FeedbackModalProps) {
  const [helpfulnessRating, setHelpfulnessRating] = useState(0);
  const [accuracyRating, setAccuracyRating] = useState(0);
  const [hoveredHelpfulStar, setHoveredHelpfulStar] = useState(0);
  const [hoveredAccuracyStar, setHoveredAccuracyStar] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");

  const handleSubmit = () => {
    if (helpfulnessRating === 0 && accuracyRating === 0 && !feedbackText.trim()) {
      toast.error("Please provide at least one rating or feedback");
      return;
    }

    // send extended feedback to backend
    try {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "extended",
          helpfulnessRating,
          accuracyRating,
          feedbackText,
          conversation: conversation || [],
        }),
      }).catch(() => {});
    } catch (e) {}

    toast.success("Thank you for your feedback!");
    handleClose();
  };

  const handleClose = () => {
    setHelpfulnessRating(0);
    setAccuracyRating(0);
    setHoveredHelpfulStar(0);
    setHoveredAccuracyStar(0);
    setFeedbackText("");
    onClose();
  };

  const renderStars = (
    rating: number,
    hoveredStar: number,
    onRate: (rating: number) => void,
    onHover: (rating: number) => void
  ) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hoveredStar || rating);
          return (
            <button
              key={star}
              onClick={() => onRate(star)}
              onMouseEnter={() => onHover(star)}
              onMouseLeave={() => onHover(0)}
              className="transition-transform hover:scale-110"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-none text-gray-300"
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-900">Provide Feedback</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Helpfulness Rating */}
            <div>
              <p className="text-sm text-gray-700 mb-3">
                How's the conversation going?
              </p>
              {renderStars(
                helpfulnessRating,
                hoveredHelpfulStar,
                setHelpfulnessRating,
                setHoveredHelpfulStar
              )}
            </div>

            {/* Accuracy Rating */}
            <div>
              <p className="text-sm text-gray-700 mb-3">How helpful is this conversation?</p>
              {renderStars(
                accuracyRating,
                hoveredAccuracyStar,
                setAccuracyRating,
                setHoveredAccuracyStar
              )}
            </div>

            {/* Feedback Input */}
            <div>
              <label htmlFor="feedback" className="text-sm text-gray-700 mb-2 block">
                Additional feedback (optional)
              </label>
              <Textarea
                id="feedback"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit Feedback</Button>
          </div>
        </div>
      </div>
    </>
  );
}