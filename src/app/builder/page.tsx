'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  
  enum LoadingState {
    CreatingPrompt,
    CreatingAssistant,
    Finished,
  }
  const [isLoading, setIsLoading] = useState<LoadingState>(LoadingState.Finished)
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setFormData({ ...formData, [name]: checked });
  };
  
  const [prompt, setPrompt] = useState('');
  const [promptComplete, setPromptComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadingMessages = [
    "Brewing a witty prompt, hold tight!",
    "Summoning the muses of AI, please wait...",
    "Channeling the spirit of Shakespeare, one moment...",
    "Consulting the oracle of algorithms, standby...",
    "Decoding the matrix of creativity, almost there...",
    "Stirring the cauldron of artificial intelligence...",
    "Weaving a tapestry of digital brilliance...",
    "Calibrating the flux capacitor of ideas...",
    "Harnessing the power of a thousand CPUs...",
    "Traversing the neural networks of imagination..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading !== LoadingState.Finished) {
      interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        setLoadingMessage(loadingMessages[randomIndex]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(LoadingState.CreatingPrompt);
    if (prompt) {
      const confirmAppend = window.confirm(
        `This will append the prompt to the existing prompt. 
        If you want to start from scratch, please delete the existing prompt and try again.
        Do you want to continue?`
      );
      if (!confirmAppend) {
        return;
      }
    }
    const response = await fetch('/api/builder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: ApiTarget.Builder,
        action: ApiAction.CreatePrompt,
        data: {
          ...formData
        }
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      setPrompt(prevPrompt => prevPrompt + chunk);
    }
    setPromptComplete(true);
    setIsLoading(LoadingState.Finished);
  };
  
  const router = useRouter();

  const handleConfirmAssistantPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(LoadingState.CreatingAssistant);
    sendApiCall({
      action: ApiAction.CreateAssistant,
      target: ApiTarget.Builder,
      data: {
        prompt: prompt,
        name: formData.templateName,
      },
    }).then((response) => {
      setIsLoading(LoadingState.Finished);
      router.push(
        `/sessions/create?assistantId=${response.assistantId}` +
        `&templateName=${formData.templateName}` +
        `&botName=harmonica_chat_bot` +
        `&contextDescription=${formData.contextDescription}`
      );
    })
  };
  
  const handleUploadPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(LoadingState.CreatingPrompt);
    // Remove any previous prompt. Should we warn users about it?
    // The most common situation for this is probably if they upload one file, realize it was the wrong one, 
    // and then upload a different one with the intention to replace the previous content.
    setPrompt('');
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
            description: 'Text Files',
            accept: {
              'text/plain': ['.txt'],
          },
        }]
      });
      const file = await fileHandle.getFile();
      const content = await file.text();
      // Wait for 4 seconds before setting the prompt
      await new Promise(resolve => setTimeout(resolve, 4000))

      setPrompt(content);
      setPromptComplete(true);
      setIsLoading(LoadingState.Finished);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDownloadPrompt = () => {
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.txt';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Template Builder</h1>
        <form className="bg-white p-6 rounded shadow space-y-4">
          <Input
            name="templateName"
            value={formData.templateName}
            onChange={handleInputChange}
            placeholder="Template Name"
            disabled={isLoading === LoadingState.CreatingPrompt}
          />
          <Textarea
            name="taskDescription"
            value={formData.taskDescription}
            onChange={handleInputChange}
            placeholder="Task Description"
            disabled={isLoading === LoadingState.CreatingPrompt}
          />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="create-summary"
                checked={formData.createSummary}
                onCheckedChange={handleSwitchChange('createSummary')}
                disabled={isLoading === LoadingState.CreatingPrompt}
              />
              <label htmlFor="create-summary">Create Summary</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="summary-feedback"
                checked={formData.summaryFeedback}
                onCheckedChange={handleSwitchChange('summaryFeedback')}
                disabled={isLoading === LoadingState.CreatingPrompt}
              />
              <label htmlFor="summary-feedback">Summary Feedback</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="require-context"
                checked={formData.requireContext}
                onCheckedChange={handleSwitchChange('requireContext')}
                disabled={isLoading === LoadingState.CreatingPrompt}
              />
              <label htmlFor="require-context">Require Context</label>
              </div>
              {formData.requireContext && (
              <Input
                name="contextDescription"
                value={formData.contextDescription}
                onChange={handleInputChange}
                placeholder="What context is required?"
                disabled={isLoading === LoadingState.CreatingPrompt}
              />
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-skip-steps"
                checked={formData.enableSkipSteps}
                onCheckedChange={handleSwitchChange('enableSkipSteps')}
                disabled={isLoading === LoadingState.CreatingPrompt}
              />
              <label htmlFor="enable-skip-steps">Enable participants to skip steps</label>
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              type="submit"
              onClick={isEditing ? handleSubmit : () => setIsEditing(true)}
              className="w-full m-2"
              disabled={isLoading === LoadingState.CreatingPrompt}
            >
              {isLoading === LoadingState.CreatingPrompt ? (
                showLoadingIndicator()
              ) : (
                isEditing ? 'Submit' : 'Edit'
              )}
            </Button>
            <Button className="m-2 bg-accent text-gray-800 hover:bg-gray-400/50"
              onClick={handleUploadPrompt}
            >
              Load Prompt
            </Button>
          </div>
        </form>
        {prompt && (
          <>
            <div className="mt-4 space-2">
              <label htmlFor="assistant-prompt">Assistant Prompt</label>
              <textarea
                id="assistant-prompt"
                name="assistantPrompt"
                value={prompt}
                onChange={promptComplete ? handlePromptChange : undefined}
                className="w-full p-2 border rounded"
                rows={12}
              />
            </div>
            <div className="flex justify-between">
              <Button
                type="button"
                onClick={handleConfirmAssistantPrompt}
                className="w-full m-2"
                disabled={isLoading === LoadingState.CreatingAssistant}
              >
                {isLoading === LoadingState.CreatingAssistant ? (
                  showLoadingIndicator()
                ) : (
                  'Submit Assistant Prompt'
                )}
              </Button>
              <Button className="m-2 bg-white text-gray-800 hover:bg-gray-400/50"
                onClick={handleDownloadPrompt}>Download Prompt
              </Button>
            </div>
            </>
          )}
      </main>
    </div>
  );

  function showLoadingIndicator() {
    return <>
      <span className="mr-2">
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>
      <span>{loadingMessage}</span>
    </>;
  }
}
