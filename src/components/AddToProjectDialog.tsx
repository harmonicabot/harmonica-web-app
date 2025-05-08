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
  removeSessionFromWorkspace,
} from '@/lib/sessionWorkspaceActions';
import { useToast } from 'hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FolderPlus, X } from 'lucide-react';
import { getWorkspacesForSession } from '@/lib/db';

interface AddToProjectDialogProps {
  sessionId: string;
  buttonClass?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Workspace {
  id: string;
  title: string;
}

export function AddToProjectDialog({
  sessionId,
  buttonClass,
  open,
  onOpenChange,
}: AddToProjectDialogProps) {
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>(
    []
  );
  const [currentWorkspaces, setCurrentWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  const [isRemovingFromProject, setIsRemovingFromProject] = useState(false);
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
      // We need to modify the sessionWorkspaceActions.ts to add a function to get workspaces for a session
      // For now, we'll assume we have this function
      const allWorkspaces = await getAvailableWorkspaces();

      // For this implementation, we'll need to add a new server action to get workspaces for a session
      // This is a placeholder - we'll need to implement this function
      const sessionWorkspaces = await getWorkspacesForSession(sessionId);

      // Filter out workspaces that the session is already part of
      const availableWorkspacesFiltered = allWorkspaces.filter(
        (workspace) => !sessionWorkspaces.some((sw) => sw.id === workspace.id)
      );

      setAvailableWorkspaces(availableWorkspacesFiltered);
      setCurrentWorkspaces(sessionWorkspaces);
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

  const handleRemoveFromProject = async (workspaceId: string) => {
    setIsRemovingFromProject(true);
    try {
      const result = await removeSessionFromWorkspace(workspaceId, sessionId);

      if (result.success) {
        // Update the UI by moving the workspace from current to available
        const removedWorkspace = currentWorkspaces.find(
          (w) => w.id === workspaceId
        );
        if (removedWorkspace) {
          setCurrentWorkspaces((prev) =>
            prev.filter((w) => w.id !== workspaceId)
          );
          setAvailableWorkspaces((prev) => [...prev, removedWorkspace]);
        }

        toast({
          title: 'Session removed from project',
          description: 'The session has been removed from the project.',
        });
        router.refresh(); // Refresh the page to update the breadcrumb
      } else {
        toast({
          title: 'Failed to remove session from project',
          description:
            result.error ||
            'An error occurred while removing the session from the project.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error removing session from project:', error);
      toast({
        title: 'Failed to remove session from project',
        description:
          'An error occurred while removing the session from the project.',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingFromProject(false);
    }
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
        // Update the UI by moving selected workspaces from available to current
        const addedWorkspaces = availableWorkspaces.filter((w) =>
          selectedWorkspaces.includes(w.id)
        );

        setAvailableWorkspaces((prev) =>
          prev.filter((w) => !selectedWorkspaces.includes(w.id))
        );
        setCurrentWorkspaces((prev) => [...prev, ...addedWorkspaces]);

        toast({
          title: 'Session added to projects',
          description: `The session has been added to ${result.count} project${
            result.count !== 1 ? 's' : ''
          }.`,
        });
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
      setDialogOpen(false);
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
            <DialogTitle>Manage Session Projects</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {/* Current Projects Section */}
            {currentWorkspaces.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">Current Projects</h3>
                <div className="space-y-3 max-h-[150px] overflow-y-auto">
                  {currentWorkspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span className="font-medium">{workspace.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromProject(workspace.id)}
                        disabled={isRemovingFromProject}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Projects Section */}
            <div>
              <h3 className="text-sm font-medium mb-3">Available Projects</h3>
              {availableWorkspaces.length === 0 ? (
                <p className="text-center text-gray-500">
                  {currentWorkspaces.length > 0
                    ? 'No other projects available.'
                    : 'No available projects yet. Create a project first.'}
                </p>
              ) : (
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {availableWorkspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span className="font-medium">{workspace.title}</span>
                      <Checkbox
                        id={workspace.id}
                        checked={selectedWorkspaces.includes(workspace.id)}
                        onCheckedChange={() =>
                          handleWorkspaceSelection(workspace.id)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
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
