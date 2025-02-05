import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface GenerateResponsesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export default function GenerateResponsesModal({
  isOpen,
  onOpenChange,
  sessionId,
}: GenerateResponsesModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    prompt: '',
    numSessions: 1,
    temperature: 0.7,
    maxAnswers: 10,
  });
  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate sessions');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to generate sessions:', error);
      // TODO: Add error toast notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Generate Responses</DialogTitle>
          <DialogDescription>
            Configure parameters for response generation
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt">Character Prompt</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) =>
                setFormData({ ...formData, prompt: e.target.value })
              }
              placeholder="Enter your character prompt..."
              className="min-h-[200px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sessions">Number of Sessions</Label>
              <Input
                id="sessions"
                type="number"
                min="1"
                value={formData.numSessions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    numSessions: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    temperature: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxAnswers">Max Number of Answers</Label>
            <Input
              id="maxAnswers"
              type="number"
              min="1"
              max="100"
              value={formData.maxAnswers}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxAnswers: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
