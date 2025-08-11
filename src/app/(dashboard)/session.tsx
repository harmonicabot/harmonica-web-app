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
import { MoreHorizontal, Copy, Trash2, FolderPlus, Share2 } from 'lucide-react';
import { deleteSession } from './actions';
import { SessionTableData } from './sessions-table';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cloneSession } from '@/lib/serverUtils';
import { useRouter } from 'next/navigation';
import { toast } from 'hooks/use-toast';
import { SessionStatus } from '@/lib/clientUtils';
import { AddToProjectDialog } from '@/components/AddToProjectDialog';
import ShareSettings from '@/components/ShareSettings';

function DeleteSessionDialog({
  isOpen,
  onClose,
  session,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  session: SessionTableData;
  onDelete: (sessionId: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

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
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This will permanently delete the session "{session.topic}" and all
            its data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Session({
  session,
  onDelete,
}: {
  session: SessionTableData;
  onDelete: (sessionId: string) => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const router = useRouter();

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

  const addToProject = async () => {
    setShowProjectDialog(true);
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
            <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Share</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addToProject}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add to Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleClone} disabled={isCloning}>
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      {showShareDialog && (
        <ShareSettings
          resourceId={session.id}
          resourceType="SESSION"
          initialIsOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      <DeleteSessionDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        session={session}
        onDelete={onDelete}
      />

      <AddToProjectDialog
        sessionId={session.id}
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
      />
    </TableRow>
  );
}
