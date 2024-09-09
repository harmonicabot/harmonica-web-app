'use client';

import { useState } from 'react';
import CreateSession from './create';
import ReviewPrompt from './review';
import ShareSession from './share';
import { LoadingMessage } from './loading';
import { ApiAction, ApiTarget, TemplateBuilderData } from '@/lib/types';
import { MagicWand } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { sendApiCall } from '@/lib/utils';
import { useRouter } from 'next/router';

enum State {
  Create,
  Review,
  Share
}

export function CreationFlow() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<State>(State.Create);
  const [assistantId, setAssistantId] = useState();
  const [prompt, setPrompt] = useState('');
  const [promptComplete, setPromptComplete] = useState(false);

  const [formData, setFormData] = useState<TemplateBuilderData>({
    sessionName: '',
    goal: '',
    critical: '',
    context: '',
    createSummary: false,
    summaryFeedback: false,
    requireContext: false,
    contextDescription: '',
    enableSkipSteps: false,
  });

  const onFormDataChange = (newFormData: Partial<TemplateBuilderData>) => {
    setFormData(prevData => ({ ...prevData, ...newFormData }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setActiveStep(State.Review);
    const response = await fetch('/api/builder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: ApiTarget.Builder,
        action: ApiAction.CreatePrompt,
        data: {
          ...formData,
        },
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      setPrompt((prevPrompt) => prevPrompt + chunk);
    }
    setPromptComplete(true);
    setIsLoading(false);
  };
  const router = useRouter()
  const handleReviewComplete = (e: React.FormEvent) => {
    e.preventDefault();
    sendApiCall({
      action: ApiAction.CreateAssistant,
      target: ApiTarget.Builder,
      data: {
        prompt: prompt,
        name: formData.sessionName,
      },
    }).then((response) => {
      setAssistantId(response.assistantId)
    });

    setActiveStep(State.Share);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <main className="max-w-2xl mx-auto items-center align-middle">
        <div className="flex items-center justify-center mb-6">   
          <div className="mr-4">
            <MagicWand />
          </div>
          <h1 className="text-3xl font-bold">New Session</h1>
        </div>

        <div className="flex justify-center space-x-2 mb-6">
          {Object.values(State).map((tab) => (
            <Button
              key={tab}
              variant={activeStep === tab ? 'default' : 'outline'}
            >
              {tab}
            </Button>
          ))}
        </div>

        {activeStep === 0
          && <CreateSession
          onSubmit={handleSubmit}
          formData={formData}
          onFormDataChange={onFormDataChange} />}
        {activeStep === 1 && (
          isLoading
            ? <LoadingMessage />
            : <ReviewPrompt
              prompt={prompt}
              onComplete={handleReviewComplete} />
        )}
        {activeStep === 2 && <ShareSession botId="TODO" sessionId="TODO" />}
      </main>
    </div>
    
  );
}