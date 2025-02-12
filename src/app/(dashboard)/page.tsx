import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import { getHostSessions } from '@/lib/db';
import Link from 'next/link';
import { cache } from 'react';
import ErrorPage from '@/components/Error';
import { getGeneratedMetadata } from 'app/api/metadata';
import Image from 'next/image';

export const dynamic = 'force-dynamic'; // getHostSessions is using auth, which can only be done client side
export const revalidate = 300; // Revalidate the data every 5 minutes (or on page reload)
export const metadata = getGeneratedMetadata('/');

const sessionCache = cache(async () => {
  try {
    return await getHostSessions([
      'id',
      'topic',
      'start_time',
      'final_report_sent',
      'active',
      'client',
    ]);
  } catch (error) {
    console.error('Failed to fetch host sessions: ', error);
    return undefined;
  }
});

export default async function Dashboard() {
  console.log('Loading session data');
  let mpClient = true;
  const hostSessions = await sessionCache();
  if (!hostSessions) {
    return <ErrorPage title={''} message={''} />;
  } else {
    mpClient = hostSessions.every(
      (session) => session.client === 'auth0|679de14aa9e0c4faa3b80ac2',
    );
  }
  return (
    <>
      {hostSessions.length > 0 && !mpClient && (
        <div className="container mx-auto mb-6 px-0">
          <div className="border border-gray-200 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-8">
              <div className="flex flex-col items-center md:items-start space-y-4 px-4 md:px-8">
                <h2 className="text-2xl font-semibold">
                  Support us in the current Giveth QF Round!
                </h2>
                <p className="text-base text-gray-600 text-center md:text-left">
                  Harmonica is a free open-source tool for collective
                  sensemaking. From now until 14th February, you can support our
                  mission to increase alignment in communities.
                </p>
                <p className="text-base text-gray-600 text-center md:text-left">
                  Every dollar you give will affect how much we'll get from the
                  $100,000 matching pool, based on the quadratic funding
                  mechanism. All the money we receive from this round will be
                  spent on developing the critical functionality of our product.
                </p>
                <Link
                  href="https://giveth.io/project/harmonica-ai-agent-for-multiplayer-sensemaking"
                  target="_blank"
                >
                  <Button variant="outline" className="border-2">
                    Support Harmonica
                  </Button>
                </Link>
              </div>
              <div className="relative w-full h-[300px] md:h-[280px] flex items-center justify-center">
                <Image
                  src="/dashboard_banner.png"
                  alt="Giveth Round is Live!"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}
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
          {hostSessions.length > 0 && mpClient && (
            <div>
              <Link href="/workspace/ENS-PSL" target="_blank" className="mr-2">
                <Button
                  size="lg"
                  className="gap-1 bg-purple-900 hover:bg-purple-800"
                >
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    ENS-PSL Workspace
                  </span>
                </Button>
              </Link>
              <Link href="/create">
                <Button size="lg" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Create Session
                  </span>
                </Button>
              </Link>
            </div>
          )}
        </div>
        <TabsContent value="all">
          <SessionsTable sessions={hostSessions} />
        </TabsContent>
      </Tabs>
    </>
  );
}
