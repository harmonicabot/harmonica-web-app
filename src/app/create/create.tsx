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
    <form className="bg-white mx-auto p-10 rounded-xl shadow space-y-12">
      <div className="space-y-2">
        <Label htmlFor="sessionName" size='lg'>Session Name*</Label>
        <Input
          name="sessionName"
          value={formData.sessionName}
          onChange={handleInputChange}
          placeholder="Marketing Strategy Brainstorm"
          required
          data-1p-ignore
          data-bwignore
          data-lpignore="true"
          data-form-type="other"
        />
        <p className="text-sm text-muted-foreground">
          Enter a clear session name that will be shared with participants
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal" size='lg'>What is the objective of your Session?*</Label>
        <Textarea
          name="goal"
          value={formData.goal}
          onChange={handleInputChange}
          placeholder="I want to understand user preferences on our new product features."
          required
        />
        <p className="text-sm text-muted-foreground">
          Summarize what you aim to learn or achieve in this session
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="critical" size='lg'>
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
          What context would be useful for our AI to know?
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="context" size='lg'>
          What context would be useful for our AI to know?
        </Label>
        <Textarea
          name="context"
          value={formData.context}
          onChange={handleInputChange}
          placeholder="Our company is developing a new app, and this session is part of our usability testing to gather user feedback on key features."
        />
        <p className="text-sm text-muted-foreground">Provide background to help our AI to understand the purpose of your session.</p>
      </div>
    </form>
  );
}
