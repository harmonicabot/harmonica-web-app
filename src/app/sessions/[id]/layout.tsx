import Link from 'next/link';

import { Analytics } from '@vercel/analytics/react';
import { getWorkspacesForSession } from '@/lib/db';
import { decryptId } from '@/lib/encryptionUtils';
import { AddToProjectDialog } from '@/components/AddToProjectDialog';
import { Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <div className="flex flex-col sm:gap-10 sm:py-4 sm:px-14">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <ProjectBar sessionId={decryptId(params.id)} />
        </header>
        <div className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4">
          {children}
        </div>
      </div>
      <Analytics />
    </div>
  );
}

async function ProjectBar({ sessionId }: { sessionId: string }) {
  const projects = await getWorkspacesForSession(sessionId);



  return (
    <div className="flex items-center space-x-2 overflow-x-auto">
      {projects.length > 0 && (
        <>
          <span className="text-sm text-muted-foreground">Projects:</span>
          <div className="flex gap-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/workspace/${project.id}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center gap-1"
                >
                  <Folder className="h-3 w-3" />
                  {project.title}
                </Button>
              </Link>
            ))}
          </div>
        </>
      )}
      <span>&nbsp;</span>
      <AddToProjectDialog sessionId={sessionId} buttonClass="text-xs flex items-center gap-1"/>    
      </div>
  );
}
