'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function CreateSession({
  onSubmit,
  formData,
  onFormDataChange,
}) {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onFormDataChange({ [e.target.name]: e.target.value });
  };

  return (
    <form className="bg-white mx-auto p-6 rounded shadow space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sessionName">Session Name</Label>
        <Input
          name="sessionName"
          value={formData.sessionName}
          onChange={handleInputChange}
          placeholder="E.g. Team Brainstorm"
          required
          data-1p-ignore
          data-bwignore
          data-lpignore="true"
          data-form-type="other"
        />
        <p className="text-sm text-muted-foreground">
          This will be shared with your participants
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal">What is the objective of your Session?</Label>
        <Textarea
          name="goal"
          value={formData.goal}
          onChange={handleInputChange}
          placeholder="I want to understand..."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="critical">
          What specific information is critical for you to understand or gather
          from participants?
        </Label>
        <Textarea
          id="critical"
          name="critical"
          value={formData.critical}
          onChange={handleInputChange}
          placeholder="Participant team and role? Their experience of the topic? Their rating of the topic (ie. quantitative data) or their opinion of the topic (ie. qualitative data)"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="context">
          Please provide any context to this deliberation session. eg. a brief
          explanation of the wider situation in terms of what your broad aims
          are, your deadlines or timing and the output you might ultimately need
          to create. This helps Monica understand the level of detail for
          questions and judge the responses based on your requirements.
        </Label>
        <Textarea
          name="context"
          value={formData.context}
          onChange={handleInputChange}
          placeholder="Our company provides X services. Our team serves Y function. This session is part of our insight gathering for Z project with these objectives..."
        />
      </div>
    </form>
  );
}
