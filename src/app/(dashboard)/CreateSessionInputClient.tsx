'use client';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { MagicWand } from '@/components/icons';
import { useRouter } from 'next/navigation';
import { ApiAction, ApiTarget } from '@/lib/types';
import { sendApiCall } from '@/lib/clientUtils';
import { Button } from '@/components/ui/button';

export default function CreateSessionInputClient() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError('Please enter your session objective.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1: Generate prompt
      const sessionName = value.trim().split(/\s+/).slice(0, 6).join(' ');
      const formData = {
        sessionName,
        goal: value.trim(),
        critical: '',
        context: '',
        crossPollination: true,
      };
      const promptRes = await sendApiCall({
        target: ApiTarget.Builder,
        action: ApiAction.CreatePrompt,
        data: formData,
      });
      if (!promptRes || !promptRes.fullPrompt) throw new Error('Failed to generate session prompt.');
      // Step 2: Create session
      const sessionData = {
        assistant_id: '',
        template_id: undefined,
        topic: sessionName,
        prompt: promptRes.fullPrompt,
        num_sessions: 0,
        num_finished: 0,
        active: true,
        final_report_sent: false,
        start_time: new Date(),
        goal: value.trim(),
        critical: '',
        context: '',
        prompt_summary: promptRes.fullPrompt.slice(0, 200),
        is_public: false,
        summary_assistant_id: '',
        cross_pollination: true,
        questions: undefined,
      };
      const res = await fetch('/api/host-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      if (!res.ok) throw new Error('Failed to create session.');
      const { id: sessionId } = await res.json();
      setValue('');
      router.push(`/sessions/${sessionId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-background border rounded-lg p-3 w-full relative min-h-[80px]">
      <div className="relative">
        <Textarea
          value={value}
          onChange={handleChange}
          placeholder="What do you want to find out?"
          className="min-h-[44px] md:min-h-[44px] flex-1 resize-none bg-background border-0 focus-visible:ring-0 focus-visible:border-0 shadow-none text-base placeholder:text-muted-foreground pr-[120px]"
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={loading}
          className="absolute bottom-2 right-2"
          variant="default"
          size="default"
        >
          <MagicWand color="white" />
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </div>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </form>
  );
} 