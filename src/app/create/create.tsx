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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
        <Label htmlFor="goal">What is the goal of your template?</Label>
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
          What is critical for you to understand or gather?
        </Label>
        <Textarea
          id="critical"
          name="critical"
          value={formData.critical}
          onChange={handleInputChange}
          placeholder="What peoples opinion is of the topic"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="context">What context will be helpful?</Label>
        <Textarea
          name="context"
          value={formData.context}
          onChange={handleInputChange}
          placeholder="Acme Co. is a company that does..."
        />
      </div>
    </form>
  );
}
