'use client';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import { getHostAndUserSessions } from '@/lib/db';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AllSessionsData, HostAndUserData } from '@/lib/types';

export default function Dashboard({
  searchParams,
}: {
  searchParams: { q: string; offset: string };
}) {
  const search = searchParams.q ?? '';
  const offset = searchParams.offset ?? 0;

  const [allData, setAllData] = useState<AllSessionsData>({});

  useEffect(() => {
    // console.log('Migrating sessions from Make to NeonDB...');
    // migrateFromMake();
    callNeonDB();
  }, [search, offset]);

  async function callNeonDB() {
    const allSessions = await getHostAndUserSessions();
    const sortedSessions = Object.entries(allSessions)
      .sort(
        ([, a], [, b]) =>
          new Date(b.host_data.start_time).getTime() -
          new Date(a.host_data.start_time).getTime()
      )
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    setAllData(sortedSessions);
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
        <SessionsTable sessions={allData} />
      </TabsContent>
    </Tabs>
  );
}
