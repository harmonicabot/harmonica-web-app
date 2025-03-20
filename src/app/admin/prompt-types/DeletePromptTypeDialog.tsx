'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deletePromptType } from './api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  promptType: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeletePromptTypeDialog({
  promptType,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!promptType) return;
    try {
      await deletePromptType(promptType.id);
      toast({ title: 'Prompt type deleted successfully' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error deleting prompt type',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Prompt Type</DialogTitle>
        </DialogHeader>
        <p>
          Are you sure you want to delete the prompt type "{promptType?.name}"?
          This action cannot be undone.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
