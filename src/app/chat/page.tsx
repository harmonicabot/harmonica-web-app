'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { sendApiCall } from '@/lib/utils';
import { ApiAction, ApiTarget, TemplateBuilderData } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { set } from 'react-hook-form';

export default function TemplatePage() {
  const [formData, setFormData] = useState<TemplateBuilderData>({
    templateName: '',
    taskDescription: '',
    createSummary: false,
    summaryFeedback: false,
    requireContext: false,
    contextDescription: '',
    enableSkipSteps: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  };

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <main className="max-w-2xl mx-auto h-full">
        <h1 className="text-2xl font-bold mb-6">Web chat</h1>
        <div className="h-full">
          <form className="bg-white p-6 rounded shadow space-y-4 h-full flex flex-col">
            <Textarea
              name="taskDescription"
              value={formData.taskDescription}
              onChange={handleInputChange}
              placeholder="Enter your message..."
              className="flex-grow"
            />
            <div className="flex justify-between">
              <Button
                type="submit"
                onClick={handleSubmit}
                className=""
                disabled={isLoading}
              >
                Run
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
