'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import {
  getHostAndUserSessions,
  getSessions,
  getSessionsFromMake,
} from '@/lib/db';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AccumulatedSessionData } from '@/lib/types';
import * as db from '@/lib/db';

export default function Dashboard({
  searchParams,
}: {
  searchParams: { q: string; offset: string };
}) {
  const search = searchParams.q ?? '';
  const offset = searchParams.offset ?? 0;

  const [accumulated, setAccumulated] = useState<
    Record<string, AccumulatedSessionData>
  >({});
  useEffect(() => {
    callMakeAPI();
    callNeonDB();
  }, [search, offset]);

  async function callMakeAPI() {
    const accumulatedSessions = await getSessionsFromMake();
    setAccumulated(accumulatedSessions);
  }

  async function callNeonDB() {
    const accumulatedSessions = await getHostAndUserSessions();
    setAccumulated(accumulatedSessions);
  }

  const insertFake = async () => {
    const template = `Template ${Math.random().toString(36).substring(7)}`;
    const topic = `Topic ${Math.random().toString(36).substring(7)}`;
    const context = `Context ${Math.random().toString(36).substring(7)}`;
    const sessionId = await db.insertHostSession({
      numSessions: Math.floor(Math.random() * 100),
      active: Math.floor(Math.random() * 50),
      finished: Math.floor(Math.random() * 50),
      summary: `Random summary ${Math.random().toString(36).substring(7)}`,
      template: template,
      topic: topic,
      context: context,
      finalReportSent: Math.random() < 0.5,
      startTime: new Date(),
    });

    console.log('Session ID:', sessionId);
    for (let i = 1; i <= 10; i++) {
      await db.insertUserSession({
        sessionId: sessionId,
        active: Math.random() < 0.5,
        userId: Math.random().toString(36).substring(7),
        template: template,
        feedback: `Feedback ${Math.random().toString(36).substring(7)}`,
        chatText: `Chat text ${Math.random().toString(36).substring(7)}`,
        threadId: Math.random().toString(36).substring(7),
        resultText: `Result text ${Math.random().toString(36).substring(7)}`,
        topic: topic,
        context: context,
        botId: Math.random().toString(36).substring(7),
        hostChatId: Math.random().toString(36).substring(7),
      });
    }
  };

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
        <SessionsTable sessions={accumulated} offset={0} totalSessions={777} />
      </TabsContent>
    </Tabs>
  );
}
