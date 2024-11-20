'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import { getHostSessions } from '@/lib/db';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { HostSession } from '@/lib/schema_updated';

export default function Dashboard({
  searchParams,
}: {
  searchParams: { q: string; offset: string };
}) {
  const search = searchParams.q ?? '';
  const offset = searchParams.offset ?? 0;

  const [hostData, setHostData] = useState<HostSession[]>([]);
  const { user } = useUser();
  useEffect(() => {
    // console.log('Migrating sessions from Make to NeonDB...');
    // migrateFromMake();
    if (user) callNeonDB();
  }, [search, offset, user]);

  async function callNeonDB() {
    const sessionData = await getHostSessions(['id', 'topic', 'start_time', 'num_sessions', 'final_report_sent', 'num_finished', 'active']);
    const sortedSessions = sessionData
      .sort(
        (a, b) =>
          new Date(b.start_time).getTime() -
          new Date(a.start_time).getTime()
      )
    setHostData(sortedSessions);
}

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center justify-between sm:pb-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Your Sessions
          </h1>
          <p className="text-sm text-muted-foreground">
            View, manage and review your active and past sessions
          </p>
        </div>
        {/* <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="archived" className="hidden sm:flex">
            Archived
          </TabsTrigger>
        </TabsList> */}
        {/* <div className="ml-auto flex items-center gap-2"> */}
        {/* <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button> */}
        <Link href="/create">
          <Button size="lg" className="gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Create Session
            </span>
          </Button>
        </Link>
        {/* </div> */}
      </div>
      <TabsContent value="all">
        <SessionsTable sessions={hostData} />
      </TabsContent>
    </Tabs>
  );
}
