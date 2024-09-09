'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TemplateBuilderData } from '@/lib/types';
import { Label } from '@/components/ui/label';

export default function CreateSession({ onSubmit, formData, onFormDataChange }) {

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onFormDataChange({ [e.target.name]: e.target.value });
  };

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    onFormDataChange({ [name]: checked });
  };

  return (
    <form className="bg-white p-6 rounded shadow space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sessionName">Session Name</Label>
        <Input
          name="sessionName"
          value={formData.sessionName}
          onChange={handleInputChange}
          placeholder='E.g. Team Brainstorm'
          required
        />
        <p className="text-sm text-muted-foreground">
          This will be shared with your participants
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal">What is the goal of your template?</Label>
        <Textarea
          name="goal"
          value={formData.goal}
          onChange={handleInputChange}
          placeholder='I want to understand...'
          required
        />
      </div>
      <div className="space-y-2">
      <Label htmlFor="critical">
        What is critical for you to understand or gather?
      </Label>
      <Textarea
        id="critical"
        name='critical'
        value={formData.critical}
        onChange={handleInputChange}
        placeholder="What peoples opinion is of the topic"
        required
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="context">What context will be helpful?</Label>
      <Textarea
          id="context"
          value={formData.context}
          onChange={handleInputChange}              
        placeholder="Acme Co. is a company that does.."
      />
    </div>
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
          <label htmlFor="enable-skip-steps">
            Enable participants to skip steps
          </label>
        </div>
      </div>
      <div className="flex justify-between">
        <Button
          type="submit"
          onClick={ onSubmit }
          className="w-full m-2"
        >
        </Button>
      </div>
    </form>
  );
}
