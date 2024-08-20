'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { sendApiCall } from '@/lib/utils';
import { ApiAction, ApiTarget, TemplateBuilderData } from '@/lib/types';
import { useRouter } from 'next/navigation';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };
  
  const router = useRouter();

  const handleConfirmAssistantPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    sendApiCall({
      action: ApiAction.CreateAssistant,
      target: ApiTarget.Builder,
      data: {
        prompt: prompt,
        name: formData.templateName,
      },
    }).then((response) => {
      router.push(`/sessions/create
        ?assistantId=${response.assistantId}
        &templateName=${formData.templateName}
        &botName=harmonica_chat_bot
        &contextDescription=${formData.contextDescription}`
      );
    })
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
          />
          <Textarea
            name="taskDescription"
            value={formData.taskDescription}
            onChange={handleInputChange}
            placeholder="Task Description"
          />
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="create-summary"
                checked={formData.createSummary}
                onCheckedChange={handleSwitchChange('createSummary')}
              />
              <label htmlFor="create-summary">Create Summary</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="summary-feedback"
                checked={formData.summaryFeedback}
                onCheckedChange={handleSwitchChange('summaryFeedback')}
              />
              <label htmlFor="summary-feedback">Summary Feedback</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="require-context"
                checked={formData.requireContext}
                onCheckedChange={handleSwitchChange('requireContext')}
              />
              <label htmlFor="require-context">Require Context</label>
              </div>
              {formData.requireContext && (
              <Input
                name="contextDescription"
                value={formData.contextDescription}
                onChange={handleInputChange}
                placeholder="What context is required?"
              />
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-skip-steps"
                checked={formData.enableSkipSteps}
                onCheckedChange={handleSwitchChange('enableSkipSteps')}
              />
              <label htmlFor="enable-skip-steps">Enable participants to skip steps</label>
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              type="submit"
              onClick={isEditing ? handleSubmit : () => setIsEditing(true)}
              className="w-full m-2"
            >
              {isEditing ? 'Submit' : 'Edit'}
            </Button>
            <Button className="m-2 bg-accent text-gray-800 hover:bg-gray-400/50"
              onClick={async (e) => {
                e.preventDefault();
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
                  setPrompt(content);
                  setPromptComplete(true);
                } catch (error) {
                  console.error('Error uploading file:', error);
                }
              }}
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
            <div className="flex space-x-2">
              <Button onClick={handleDownloadPrompt}>Download Prompt</Button>
            </div>
          <Button
            type="button"
            onClick={handleConfirmAssistantPrompt}
            className="w-full mt-4"
          >
            Submit Assistant Prompt
            </Button>
            </>
          )}
      </main>
    </div>
  );
}
