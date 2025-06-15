'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  createThreadRating,
  getThreadRating,
  updateThreadRating,
} from '@/lib/db';
import { useUser } from '@auth0/nextjs-auth0/client';

interface RatingModalProps {
  threadId: string;
  onClose: () => void;
}

const EMOJI_RATINGS = [
  { emoji: '😫', label: 'Very dissatisfied', value: 1 },
  { emoji: '🙁', label: 'Dissatisfied', value: 2 },
  { emoji: '😐', label: 'Neutral', value: 3 },
  { emoji: '🙂', label: 'Satisfied', value: 4 },
  { emoji: '😊', label: 'Very satisfied', value: 5 },
];

export const RatingModal = ({ threadId, onClose }: RatingModalProps) => {
  const { user } = useUser();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showThanks, setShowThanks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingRating, setExistingRating] = useState<{
    rating: number;
    feedback?: string;
  } | null>(null);

  // Fetch existing rating on mount
  useEffect(() => {
    const fetchRating = async () => {
      try {
        const rating = await getThreadRating(threadId);
        if (rating) {
          setExistingRating({
            rating: rating.rating,
            feedback: rating.feedback,
          });
          setSelectedRating(rating.rating);
          setFeedback(rating.feedback || '');
        }
      } catch (error) {
        console.error('Error fetching rating:', error);
      }
    };
    fetchRating();
  }, [threadId]);

  const handleSubmit = async () => {
    if (!selectedRating) return;
    setIsLoading(true);

    try {
      if (!showFeedback) {
        // First submit - create the rating immediately
        if (!existingRating) {
          await createThreadRating({
            threadId,
            rating: selectedRating,
            userId: user?.sub || undefined,
          });
        }
        setShowFeedback(true);
        setIsLoading(false);
        return;
      }

      // Second submit - update with feedback
      await updateThreadRating(threadId, {
        rating: selectedRating,
        feedback: feedback.trim() || undefined,
      });

      setShowThanks(true);
      // Hide modal after showing thanks
      setTimeout(() => {
        onClose();
      }, 4000);
    } catch (error) {
      console.error('Error submitting rating:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  if (showThanks) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-lg w-full max-w-sm text-center">
        <div className="text-4xl mb-2">✨</div>
        <h2 className="text-lg font-semibold mb-1">Awesome!</h2>
        <p className="text-gray-600 text-sm">
          Your feedback helps make conversations better for everyone
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg w-[320px]">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-lg font-semibold leading-tight">
          {showFeedback ? 'Want to share more?' : 'How satisfied are you?'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!showFeedback ? (
        <>
          <div className="flex justify-between mb-4">
            {EMOJI_RATINGS.map((rating) => (
              <button
                key={rating.value}
                onClick={() => setSelectedRating(rating.value)}
                className={`flex flex-col items-center transition-all ${
                  selectedRating === rating.value
                    ? 'transform scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="text-3xl">{rating.emoji}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-between text-xs text-gray-500 mb-4">
            <span>Very dissatisfied</span>
            <span>Very satisfied</span>
          </div>
        </>
      ) : (
        <div className="mb-4">
          <Textarea
            placeholder="Tell us more about your experience..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full h-24 resize-none"
          />
        </div>
      )}

      <Button
        className={`w-full ${
          selectedRating
            ? 'bg-black hover:bg-black/90 text-white'
            : 'bg-gray-200 hover:bg-gray-200 text-gray-500'
        }`}
        disabled={!selectedRating || isLoading}
        onClick={handleSubmit}
      >
        {isLoading
          ? 'Submitting...'
          : showFeedback
            ? 'Submit Feedback'
            : 'Submit'}
      </Button>
    </div>
  );
};
