'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import { getSessions, getSessionsFromMake } from '@/lib/db';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AccumulatedSessionData } from '@/lib/types';

export default function Dashboard({
  searchParams
}: {
  searchParams: { q: string; offset: string };
}) {
  const search = searchParams.q ?? '';
  const offset = searchParams.offset ?? 0;  
 
  const [accumulated, setAccumulated] = useState<Record<string, AccumulatedSessionData>>({});
  useEffect(() => {
    callMakeAPI();
    callNeonDB(search, offset);
  }, [search, offset]);
  
  async function callMakeAPI() {
    const accumulatedSessions = await getSessionsFromMake();
    setAccumulated(accumulatedSessions);
  }

  async function callNeonDB(search, offset) {
    const { sessions, newOffset, totalSessions } = await getSessions(
      search,
      Number(offset)
    );
  }

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="archived" className="hidden sm:flex">
            Archived
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button>
          <Link href="/create">
            <Button size="sm" className="h-8 gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                New Session
              </span>
            </Button>
          </Link>
        </div>
      </div>
      <TabsContent value="all">
        <SessionsTable
          sessions={accumulated}
          offset={0}
          totalSessions={777}
        />
      </TabsContent>
    </Tabs>
  );
}