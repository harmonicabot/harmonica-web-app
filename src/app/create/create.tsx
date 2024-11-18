'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SessionBuilderData } from '@/lib/types';

export default function CreateSession({
  onSubmit,
  formData,
  onFormDataChange,
  onValidationError,
}: {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formData: SessionBuilderData;
  onFormDataChange: (form: Partial<SessionBuilderData>) => void;
  onValidationError: (hasErrors: boolean) => void;
}) {
  const [errors, setErrors] = useState<{
    sessionName?: string;
    goal?: string;
  }>({});
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);

  useEffect(() => {
    if (isSubmitAttempted) {
      validateForm();
    }
  }, [formData.sessionName, formData.goal, isSubmitAttempted]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (errors[e.target.name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [e.target.name]: undefined,
      }));
    }
    onFormDataChange({ [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.sessionName?.trim()) {
      newErrors.sessionName = 'Session name is required';
    }

    if (!formData.goal?.trim()) {
      newErrors.goal = 'Session objective is required';
    }

    setErrors(newErrors);
    const hasErrors = Object.keys(newErrors).length > 0;
    onValidationError(hasErrors);
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitAttempted(true);

    if (validateForm()) {
      await onSubmit(e);
    }
  };

  return (
    <form
      className="bg-white mx-auto p-10 rounded-xl shadow space-y-12"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label htmlFor="sessionName" size="lg">
          Session Name*
        </Label>
        <Input
          name="sessionName"
          value={formData.sessionName}
          onChange={handleInputChange}
          placeholder="Marketing Strategy Brainstorm"
          required
          className={
            isSubmitAttempted && errors.sessionName
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }
          data-1p-ignore
          data-bwignore
          data-lpignore="true"
          data-form-type="other"
        />
        {isSubmitAttempted && errors.sessionName && (
          <p className="text-sm text-red-500">{errors.sessionName}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Enter a clear session name that will be shared with participants
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal" size="lg">
          What is the objective of your Session?*
        </Label>
        <Textarea
          name="goal"
          value={formData.goal}
          onChange={handleInputChange}
          placeholder="I want to understand user preferences on our new product features."
          required
          className={
            isSubmitAttempted && errors.goal
              ? 'border-red-500 focus-visible:ring-red-500'
              : ''
          }
        />
        {isSubmitAttempted && errors.goal && (
          <p className="text-sm text-red-500">{errors.goal}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Summarize what you aim to learn or achieve in this session
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="critical" size="lg">
          What is critical for you to gather from your participants answers?
        </Label>
        <Textarea
          id="critical"
          name="critical"
          value={formData.critical}
          onChange={handleInputChange}
          placeholder="Participants should provide examples of their workflows or describe challenges they face."
          required
        />
        <p className="text-sm text-muted-foreground">
          Specify what kind of information or details you need from participant
          responses
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="context" size="lg">
          What context would be useful for our AI to know?
        </Label>
        <Textarea
          name="context"
          value={formData.context}
          onChange={handleInputChange}
          placeholder="Our company is developing a new app, and this session is part of our usability testing to gather user feedback on key features."
        />
        <p className="text-sm text-muted-foreground">
          Provide background to help our AI to understand the purpose of your
          session.
        </p>
      </div>
    </form>
  );
}
