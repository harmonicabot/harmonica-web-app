'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Folder, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { WorkspaceWithSessions } from './page';
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteWorkspace } from './actions';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpsertWorkspace } from '@/stores/SessionStore';

function CreateWorkspaceButton({ text = 'New Project' }: { text?: string }) {
  return (
    <Link href="/create-workspace">
      <Card className="h-14 border border-border flex items-center px-4 cursor-pointer hover:bg-accent transition-colors bg-background">
        <CardContent className="flex flex-row items-center justify-between w-full p-0 bg-transparent">
          <span className="flex flex-row items-center gap-2 flex-1 min-w-0">
            <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-base truncate">{text}</span>
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectCard({ workspace }: { workspace: WorkspaceWithSessions }) {
  const hasSessions = workspace.sessions.length > 0;
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState(workspace.title);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
  const upsertWorkspace = useUpsertWorkspace();
  
  // Update newTitle when workspace title changes
  React.useEffect(() => {
    setNewTitle(workspace.title);
  }, [workspace.title]);
  
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${workspace.title}"?`)) {
      setIsDeleting(true);
      try {
        await deleteWorkspace(workspace.id);
        // Refresh the page to update the list
        router.refresh();
      } catch (error) {
        console.error('Error deleting workspace:', error);
        alert('Failed to delete workspace. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleRename = async () => {
    if (!newTitle.trim()) {
      alert('Please enter a valid title.');
      return;
    }
    
    setIsRenaming(true);
    try {
      await upsertWorkspace.mutateAsync({ id: workspace.id, data: { title: newTitle.trim() } });

      setIsRenameDialogOpen(false);
      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error('Error renaming workspace:', error);
      alert('Failed to rename workspace. Please try again.');
    } finally {
      setIsRenaming(false);
    }
  };
  
  return (
    <div className="relative">
      <Card className="h-14 border border-border flex items-center px-4 cursor-pointer hover:bg-accent transition-colors bg-background">
        <CardContent className="flex flex-row items-center justify-between w-full p-0">
          {/* Left: Folder icon + project name */}
          <Link href={`/workspace/${workspace.id}`} className="flex flex-row items-center gap-2 relative group hover:bg-accent/50 rounded px-2 py-1 transition-colors flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <Folder className="h-5 w-5 text-muted-foreground" />
              {/* Number positioned inside the folder */}
              {hasSessions && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground drop-shadow-[0_-1px_0_rgba(255,255,255,1)]">
                    {workspace.sessions.length}
                  </span>
                </div>
              )}
            </div>
            <span className="font-medium text-base truncate" title={workspace.title}>
              {workspace.title}
            </span>
          </Link>
          {/* Right: Menu button with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent hover:ring-2 hover:ring-muted-foreground/20 rounded transition-all">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Sessions */}
              {hasSessions ? (
                <>
                  {workspace.sessions.map((session) => (
                    <DropdownMenuItem key={session.id} asChild>
                      <Link href={`/sessions/${session.id}`} className="cursor-pointer">
                        {session.topic}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/create" className="cursor-pointer">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Session
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {/* Actions */}
              <DropdownMenuItem
                onClick={() => setIsRenameDialogOpen(true)}
                disabled={isRenaming}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {isRenaming ? 'Renaming...' : 'Rename'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
      
      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Project Name
              </label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter project name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRename();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRenameDialogOpen(false);
                  setNewTitle(workspace.title);
                }}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={isRenaming || !newTitle.trim()}
              >
                {isRenaming ? 'Renaming...' : 'Rename'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadMoreButton({ currentCount, totalCount }: { currentCount: number; totalCount: number }) {
  const nextPage = Math.ceil(currentCount / 8) + 1;
  const remainingItems = totalCount - currentCount;

  if (remainingItems <= 0) return null;

  return (
    <Link href={`?page=${nextPage}`}>
      <Card className="h-14 border border-border flex items-center px-4 cursor-pointer hover:bg-accent transition-colors bg-background">
        <CardContent className="flex flex-row items-center justify-center w-full p-0">
          <span className="text-sm text-muted-foreground">
            Load more
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProjectsGrid({ 
  workspaces,
  searchParams,
}: { 
  workspaces: WorkspaceWithSessions[];
  searchParams?: { page?: string };
}) {
  const currentPage = searchParams?.page ? parseInt(searchParams.page) : 1;
  const startIndex = 0;
  const endIndex = currentPage * 8;
  const sortedWorkspaces = workspaces.sort((a, b) => a.last_modified.getTime() - b.last_modified.getTime())
  const displayedWorkspaces = sortedWorkspaces.slice(startIndex, endIndex);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* New Project card as first item */}
      <CreateWorkspaceButton />
      {displayedWorkspaces.map((workspace) => (
        <ProjectCard key={workspace.id} workspace={workspace} />
      ))}
      <LoadMoreButton currentCount={displayedWorkspaces.length} totalCount={workspaces.length} />
    </div>
  );
} 