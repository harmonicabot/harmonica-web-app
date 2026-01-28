'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SessionDetailsTabProps {
  formData: {
    sessionName: string;
    goal: string;
    critical: string;
    context: string;
  };
  onFieldChange: (field: string, value: string) => void;
}

export function SessionDetailsTab({
  formData,
  onFieldChange,
}: SessionDetailsTabProps) {
  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Session Details</h3>
        <p className="text-sm text-muted-foreground">
          Update the basic information about your session.
        </p>
      </div>

      {/* a. Session Name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Session Name</Label>
        <Input
          value={formData.sessionName}
          onChange={(e) => onFieldChange('sessionName', e.target.value)}
          placeholder="Enter session name"
        />
      </div>

      {/* b. Goal */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Objective/Goal</Label>
        <Textarea
          value={formData.goal}
          onChange={(e) => onFieldChange('goal', e.target.value)}
          placeholder="What is the objective of your session?"
          rows={4}
        />
      </div>

      {/* c. Critical Info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Critical Info</Label>
        <Textarea
          value={formData.critical}
          onChange={(e) => onFieldChange('critical', e.target.value)}
          placeholder="What is critical to gather from participants?"
          rows={4}
        />
      </div>

      {/* d. Context */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Context</Label>
        <Textarea
          value={formData.context}
          onChange={(e) => onFieldChange('context', e.target.value)}
          placeholder="What context would be useful for our AI to know?"
          rows={4}
        />
      </div>
    </div>
  );
}

