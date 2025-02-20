'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ExternalLink, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import SortableTable from '@/components/SortableTable';
import { useState } from 'react';
import { HostSession } from '@/lib/schema';

interface Workspace {
  id: string;
  title: string;
  description: string;
  created_at: string;
  num_sessions: number;
  num_participants: number;
  sessions?: HostSession[];
}

function SessionRow({ session, workspaceId }: { session: HostSession; workspaceId: string }) {
  return (
    <TableRow className="bg-muted/50">
      <TableCell className="font-medium pl-12">
        <Link href={`/workspace/${workspaceId}/${session.id}`}>
          <div className="font-medium">{session.topic}</div>
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={session.active ? "bg-lime-100 text-lime-900" : ""}>
          {session.active ? "Active" : "Finished"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-500" />
          -
        </div>
      </TableCell>
      <TableCell>
        {new Date(session.start_time).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/workspace/${workspaceId}/${session.id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Open</span>
            </Button>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  const [isExpanded, setIsExpanded] = useState(false);

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
            {workspace.num_sessions} Sessions
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-500" />
            {workspace.num_participants}
          </div>
        </TableCell>
        <TableCell>
          {new Date(workspace.created_at).toLocaleDateString()}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Link href={`/workspace/${workspace.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open</span>
              </Button>
            </Link>
            <Link href={`/workspace/${workspace.id}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && workspace.sessions && workspace.sessions.map((session) => (
        <SessionRow 
          key={session.id} 
          session={session} 
          workspaceId={workspace.id}
        />
      ))}
    </>
  );
}

export function WorkspacesTable({ workspaces }: { workspaces: Workspace[] }) {
  const tableHeaders = [
    {
      label: 'Workspace',
      sortKey: 'title',
      className: 'cursor-pointer',
    },
    {
      label: 'Sessions',
      sortKey: 'num_sessions',
      className: 'cursor-pointer',
    },
    {
      label: 'Participants',
      sortKey: 'num_participants',
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

  const getTableRow = (workspace: Workspace, index: number) => {
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