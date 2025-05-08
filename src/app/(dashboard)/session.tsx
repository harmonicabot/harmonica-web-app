import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { encryptId } from '@/lib/encryptionUtils';
import Link from 'next/link';
import { User, UserCheck } from '@/components/icons';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Trash2, FolderPlus } from 'lucide-react';
import { deleteSession } from './actions';
import { SessionTableData } from './sessions-table';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cloneSession } from '@/lib/serverUtils';
import { useRouter } from 'next/navigation';
import { toast } from 'hooks/use-toast';
import { SessionStatus } from '@/lib/clientUtils';
import { addSessionToWorkspaces, getAvailableWorkspaces } from '@/lib/sessionWorkspaceActions';

export function Session({
  session,
  onDelete,
}: {
  session: SessionTableData;
  onDelete: (sessionId: string) => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<{ id: string; title: string }[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSession(session.id);
      onDelete(session.id);
      toast({
        title: 'Session deleted',
        description: 'The session has been successfully deleted.',
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Failed to delete session',
        description: 'An error occurred while deleting the session.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const newSessionId = await cloneSession(session.id);
      if (newSessionId) {
        toast({
          title: 'Session cloned successfully',
          description: "You'll be redirected to the new session.",
        });
        router.push(`/sessions/${encryptId(newSessionId)}`);
      } else {
        toast({
          title: 'Failed to clone session',
          description: 'An error occurred while cloning the session.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cloning session:', error);
      toast({
        title: 'Failed to clone session',
        description: 'An error occurred while cloning the session.',
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  const handleWorkspaceSelection = (workspaceId: string) => {
    setSelectedWorkspaces((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

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

  const addToProject = async () => {
    setShowProjectDialog(true);
    await loadWorkspaces();
  };

  const handleAddToProjects = async () => {
    if (selectedWorkspaces.length === 0) {
      toast({
        title: 'No projects selected',
        description: 'Please select at least one project to add the session to.',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingToProject(true);
    try {
      const result = await addSessionToWorkspaces(session.id, selectedWorkspaces);
      
      if (result.success) {
        toast({
          title: 'Session added to projects',
          description: `The session has been added to ${result.count} project${result.count !== 1 ? 's' : ''}.`,
        });
        setShowProjectDialog(false);
        setSelectedWorkspaces([]);
      } else {
        toast({
          title: 'Failed to add session to projects',
          description: result.message || 'An error occurred while adding the session to the projects.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding session to projects:', error);
      toast({
        title: 'Failed to add session to projects',
        description: 'An error occurred while adding the session to the projects.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToProject(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium text-base">
        <Link href={`/sessions/${encryptId(session.id)}`}>{session.topic}</Link>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge
          variant="outline"
          className={`capitalize ${
            session.status === SessionStatus.ACTIVE
              ? 'bg-lime-100 text-lime-900'
              : session.status === SessionStatus.DRAFT
              ? 'bg-purple-100 text-purple-900'
              : '' // Finished, remain white
          }`}
        >
          {session.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <User />
          {session.num_sessions}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <UserCheck className="mr-1 h-4 w-4 opacity-50" />
          {session.num_finished}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {session.created_on}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleClone} disabled={isCloning}>
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addToProject}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add to Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the session "{session.topic}" and all
              its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
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
                      <Label
                        htmlFor={workspace.id}
                        className="font-medium"
                      >
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
    </TableRow>
  );
}
