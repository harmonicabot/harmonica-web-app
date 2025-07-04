import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Folder, Files } from 'lucide-react';
import { WorkspaceWithSessions } from './page';
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function CreateWorkspaceButton({ text = 'New Project' }: { text?: string }) {
  return (
    <Link href="/create-workspace">
      <Card className="w-64 h-14 border border-border flex items-center px-4 cursor-pointer hover:bg-accent transition-colors bg-background">
        <CardContent className="flex flex-row items-center justify-between w-full p-0 bg-transparent">
          <span className="flex flex-row items-center gap-2">
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-base truncate">{text}</span>
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectCard({ workspace }: { workspace: WorkspaceWithSessions }) {
  const hasSessions = workspace.sessions.length > 0;
  
  return (
    <div className="w-64">
      <Card className="h-14 border border-border flex items-center px-4 cursor-pointer hover:bg-accent transition-colors bg-background">
        <CardContent className="flex flex-row items-center justify-between w-full p-0">
          {/* Left: Folder icon + project name */}
          <Link href={`/workspace/${workspace.id}`} className="flex flex-row items-center gap-2">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-base truncate max-w-[120px]" title={workspace.title}>
              {workspace.title}
            </span>
          </Link>
          {/* Right: Files icon + ticker with dropdown */}
          {hasSessions ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent">
                  <span className="flex flex-row items-center gap-1 text-muted-foreground">
                    <Files className="h-4 w-4" />
                    <span className="font-mono text-sm">{workspace.sessions.length}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {workspace.sessions.map((session) => (
                  <DropdownMenuItem key={session.id} asChild>
                    <Link href={`/sessions/${session.id}`} className="cursor-pointer">
                      {session.topic}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-accent" disabled>
              <span className="flex flex-row items-center gap-1 text-muted-foreground/50">
                <Files className="h-4 w-4" />
                <span className="font-mono text-sm">0</span>
              </span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadMoreButton({ currentCount, totalCount }: { currentCount: number; totalCount: number }) {
  const nextPage = Math.ceil(currentCount / 8) + 1;
  const remainingItems = totalCount - currentCount;
  const itemsToLoad = Math.min(10, remainingItems);

  if (remainingItems <= 0) return null;

  return (
    <Link href={`?page=${nextPage}`} className="w-64">
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
  const displayedWorkspaces = workspaces.slice(startIndex, endIndex);

  return (
    <div className="flex flex-wrap gap-4">
      {/* New Project card as first item */}
      <CreateWorkspaceButton />
      {displayedWorkspaces.map((workspace) => (
        <ProjectCard key={workspace.id} workspace={workspace} />
      ))}
      <LoadMoreButton currentCount={displayedWorkspaces.length} totalCount={workspaces.length} />
    </div>
  );
} 