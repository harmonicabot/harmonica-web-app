'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updatePromptType } from './api';
import { useToast } from 'hooks/use-toast';

interface Props {
  promptType: { id: string; name: string; description: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPromptTypeDialog({
  promptType,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (promptType) {
      setName(promptType.name);
      setDescription(promptType.description);
    }
  }, [promptType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptType) return;

    setIsLoading(true);
    try {
      await updatePromptType(promptType.id, {
        name: name.toUpperCase(),
        description,
      });
      toast({ title: 'Prompt type updated successfully' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error updating prompt type',
        description: 'Name might already exist or be invalid',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Prompt Type</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="name">Name</label>
                <span className="text-sm text-muted-foreground">
                  e.g., SUMMARY_PROMPT
                </span>
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="PROMPT_TYPE_NAME"
                required
                pattern="[A-Z][A-Z0-9_]*"
                title="Must be uppercase letters, numbers, and underscores, starting with a letter"
              />
              <p className="text-sm text-muted-foreground">
                Use uppercase letters, numbers, and underscores only. Must be
                unique.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="description">Description</label>
                <span className="text-sm text-muted-foreground">
                  e.g., Used in the article summary feature
                </span>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[200px]"
                placeholder="Describe where and how this prompt type will be used in the application. For example: This prompt type is used in the article summary feature to generate concise summaries of blog posts."
              />
              <p className="text-sm text-muted-foreground">
                Explain the purpose and usage context of this prompt type in the
                application.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
