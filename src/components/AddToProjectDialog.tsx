'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  getAvailableWorkspaces,
  addSessionToWorkspaces,
} from '@/lib/sessionWorkspaceActions';
import { useToast } from 'hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FolderPlus } from 'lucide-react';

interface AddToProjectDialogProps {
  sessionId: string;
  buttonClass?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddToProjectDialog({
  sessionId,
  buttonClass,
  open,
  onOpenChange,
}: AddToProjectDialogProps) {
  const [availableWorkspaces, setAvailableWorkspaces] = useState<
    { id: string; title: string }[]
  >([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Use external open state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : dialogOpen;

  // Use external handler if provided, otherwise use internal handler
  const handleOpenChange = onOpenChange
    ? onOpenChange
    : (open: boolean) => {
        setDialogOpen(open);
        if (open) {
          loadWorkspaces();
        }
      };

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen]);

  const loadWorkspaces = async () => {
    try {
      const workspaces = await getAvailableWorkspaces();
      setAvailableWorkspaces(workspaces);
    } catch (error) {
      console.error('Error loading workspaces:', error);
      toast({
        title: 'Failed to load projects',
        description: 'An error occurred while loading your projects.',
        variant: 'destructive',
      });
    }
  };

  const handleWorkspaceSelection = (workspaceId: string) => {
    setSelectedWorkspaces((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  const handleAddToProjects = async () => {
    if (selectedWorkspaces.length === 0) {
      toast({
        title: 'No projects selected',
        description:
          'Please select at least one project to add the session to.',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingToProject(true);
    try {
      const result = await addSessionToWorkspaces(
        sessionId,
        selectedWorkspaces
      );

      if (result.success) {
        toast({
          title: 'Session added to projects',
          description: `The session has been added to ${result.count} project${
            result.count !== 1 ? 's' : ''
          }.`,
        });
        handleOpenChange(false);
        setSelectedWorkspaces([]);
        router.refresh(); // Refresh the page to update the breadcrumb
      } else {
        toast({
          title: 'Failed to add session to projects',
          description:
            result.message ||
            'An error occurred while adding the session to the projects.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding session to projects:', error);
      toast({
        title: 'Failed to add session to projects',
        description:
          'An error occurred while adding the session to the projects.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToProject(false);
    }
  };

  return (
    <>
      {open === undefined && onOpenChange === undefined && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(true)}
          className={buttonClass || 'text-xs flex items-center gap-1'}
        >
          <FolderPlus className="h-3 w-3" />
          Add to Project
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Session to Projects</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {availableWorkspaces.length === 0 ? (
              <p className="text-center text-gray-500">
                No available projects yet. Create a project first.
              </p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {availableWorkspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="flex items-start space-x-2"
                  >
                    <Checkbox
                      id={workspace.id}
                      checked={selectedWorkspaces.includes(workspace.id)}
                      onCheckedChange={() =>
                        handleWorkspaceSelection(workspace.id)
                      }
                    />
                    <div className="grid gap-1.5">
                      <Label htmlFor={workspace.id} className="font-medium">
                        {workspace.title}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleAddToProjects}
              disabled={selectedWorkspaces.length === 0 || isAddingToProject}
            >
              {isAddingToProject ? 'Adding...' : 'Add to Selected Projects'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
