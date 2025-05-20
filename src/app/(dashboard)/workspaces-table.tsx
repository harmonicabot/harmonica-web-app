'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Share2,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import SortableTable from '@/components/SortableTable';
import { useState } from 'react';
import { HostSession } from '@/lib/schema';
import { WorkspaceWithSessions } from './page';
import { encryptId } from '@/lib/encryptionUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteWorkspace } from './actions';
import { removeSessionFromWorkspace } from '@/lib/sessionWorkspaceActions';
import ShareSettings from '@/components/ShareSettings';
import { toast } from 'hooks/use-toast';

function SessionRow({
  session,
  workspaceId,
  onRemove,
}: {
  session: HostSession;
  workspaceId: string;
  onRemove: (sessionId: string) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleRemoveSession = async () => {
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      const result = await removeSessionFromWorkspace(workspaceId, session.id);
      if (result.success) {
        onRemove(session.id);
        toast({
          title: 'Session removed',
          description: 'The session has been removed from this project.',
        });
      } else {
        toast({
          title: 'Failed to remove session',
          description:
            result.error || 'An error occurred while removing the session.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error removing session:', error);
      toast({
        title: 'Failed to remove session',
        description: 'An error occurred while removing the session.',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <TableRow className="bg-muted/50">
      <TableCell className="font-medium pl-12">
        <Link href={`/sessions/${encryptId(session.id)}`}>
          <div className="font-medium">{session.topic}</div>
        </Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={session.active ? 'bg-lime-100 text-lime-900' : ''}
        >
          {session.active ? 'Active' : 'Finished'}
        </Badge>
      </TableCell>

      <TableCell>
        {new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(session.start_time))}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/sessions/${encryptId(session.id)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Open</span>
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRemoveSession}
                disabled={isRemoving}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isRemoving ? 'Removing...' : 'Remove from Project'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
      {showShareDialog && (
        <ShareSettings
          resourceId={session.id}
          resourceType="SESSION"
          initialIsOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </TableRow>
  );
}

function WorkspaceRow({ workspace }: { workspace: WorkspaceWithSessions }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [localSessions, setLocalSessions] = useState(workspace.sessions);

  const handleDelete = async () => {
    const workspaceId = workspace.id;
    console.log('Deleting project: ', workspaceId);
    await deleteWorkspace(workspaceId);
  };

  const handleRemoveSession = (sessionId: string) => {
    setLocalSessions((prev) =>
      prev.filter((session) => session.id !== sessionId)
    );
  };

  return (
    <>
      <TableRow className="group">
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </Button>
            <Link href={`/workspace/${workspace.id}`}>
              <div>
                <div className="font-semibold">{workspace.title}</div>
                <div className="text-sm text-gray-500 truncate max-w-[400px]">
                  {workspace.description}
                </div>
              </div>
            </Link>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="bg-purple-100 text-purple-900">
            {localSessions.length} Sessions
          </Badge>
        </TableCell>
        <TableCell>
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(workspace.created_at))}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Link
              href={`/workspace/${workspace.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open</span>
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-haspopup="true" size="icon" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded &&
        localSessions &&
        localSessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            workspaceId={workspace.id}
            onRemove={handleRemoveSession}
          />
        ))}
      {showShareDialog && (
        <ShareSettings
          resourceId={workspace.id}
          resourceType="WORKSPACE"
          initialIsOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </>
  );
}

export function WorkspacesTable({
  workspaces,
}: {
  workspaces: WorkspaceWithSessions[];
}) {
  const tableHeaders = [
    {
      label: 'Project',
      sortKey: 'title',
      className: 'cursor-pointer',
    },
    {
      label: 'Sessions',
      sortKey: 'num_sessions',
      className: 'cursor-pointer',
    },
    {
      label: 'Created',
      sortKey: 'created_at',
      className: 'cursor-pointer',
      sortBy: (sortDirection: string, a: string, b: string) => {
        return sortDirection === 'asc'
          ? new Date(a).getTime() - new Date(b).getTime()
          : new Date(b).getTime() - new Date(a).getTime();
      },
    },
  ];

  const getTableRow = (workspace: WorkspaceWithSessions, index: number) => {
    return <WorkspaceRow key={index} workspace={workspace} />;
  };

  return (
    <Card>
      <CardContent>
        <SortableTable
          tableHeaders={tableHeaders}
          getTableRow={getTableRow}
          data={workspaces}
          defaultSort={{ column: 'created_at', direction: 'desc' }}
        />
      </CardContent>
    </Card>
  );
}
