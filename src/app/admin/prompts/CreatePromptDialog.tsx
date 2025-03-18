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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createPrompt } from './api';
import { useToast } from '@/hooks/use-toast';
import { fetchPromptTypes } from '../prompt-types/api';
import { Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PromptType {
  id: string;
  name: string;
}

export function CreatePromptDialog({ open, onOpenChange, onSuccess }: Props) {
  const [promptTypes, setPromptTypes] = useState<PromptType[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [instructions, setInstructions] = useState('');
  const [active, setActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const loadPromptTypes = async () => {
      try {
        const types = await fetchPromptTypes();
        setPromptTypes(types);
      } catch (error) {
        console.error('Failed to load prompt types:', error);
        toast({
          title: 'Error loading prompt types',
          description: 'Please refresh the page',
          variant: 'destructive',
        });
      }
    };
    if (open) {
      loadPromptTypes();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createPrompt({
        prompt_type: selectedType,
        instructions,
        active,
      });
      toast({ title: 'Prompt created successfully' });
      onSuccess?.();
      onOpenChange(false);
      setSelectedType('');
      setInstructions('');
      setActive(true);
    } catch (error) {
      console.error('Create error:', error);
      toast({
        title: 'Error creating prompt',
        description:
          error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`duration-300 transition-all ${
          isFullscreen
            ? 'w-screen h-screen max-w-none !rounded-none !p-6'
            : 'sm:max-w-[900px] max-h-[90vh] h-[80vh]'
        }`}
      >
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="space-y-4 py-4 flex-grow flex flex-col">
            <div className="space-y-2">
              <Label htmlFor="type">Prompt Type</Label>
              <Select
                value={selectedType}
                onValueChange={setSelectedType}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a prompt type" />
                </SelectTrigger>
                <SelectContent>
                  {promptTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-grow flex flex-col relative">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
                className={`flex-grow ${
                  isFullscreen
                    ? 'min-h-[calc(100vh-300px)]'
                    : 'min-h-[calc(100vh-500px)]'
                }`}
                placeholder="Enter the instructions for this prompt"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute bottom-2 right-2 bg-background/80 hover:bg-background"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between mt-auto">
            <div></div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
