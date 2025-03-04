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
import { Card, CardContent } from '@/components/ui/card';

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
    mpClient =
      hostSessions.length > 0 &&
      hostSessions.every(
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
                  Support Harmonica by donating in Crypto or Traditional
                  Currency!
                </h2>
                <p className="text-base text-gray-600 text-center md:text-left">
                  Harmonica is a free, open-source tool for collective
                  sense-making, helping communities align before making
                  decisions.
                </p>
                <p className="text-base text-gray-600 text-center md:text-left">
                  You can support our mission by donating in{' '}
                  <span className="text-black font-semibold">
                    crypto or traditional currency
                  </span>
                  . Every contribution helps us develop critical functionality
                  and expand access to more changemakers.
                </p>

                <div className="flex gap-4">
                  <Link
                    href="https://opencollective.com/harmonica"
                    target="_blank"
                  >
                    <Button variant="outline" className="border-2">
                      Normal currency
                    </Button>
                  </Link>
                  <Link
                    href="https://giveth.io/project/harmonica-ai-agent-for-multiplayer-sensemaking"
                    target="_blank"
                  >
                    <Button variant="outline" className="border-2">
                      Cryptocurrency
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative w-full h-[300px] md:h-[280px] flex items-center justify-center">
                <Image
                  src="/dashboard_banner.jpg"
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
          <div>
            {mpClient && (
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
            )}

            {hostSessions.length > 0 && ( // If there are no sessions we show this inside the TabsContent instead
              <CreateButton />
            )}
          </div>
        </div>
        <TabsContent value="all">
          {hostSessions.length > 0 ? (
            <SessionsTable sessions={hostSessions} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center">
                <CreateButton text="Create Your First Session" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function CreateButton({ text = 'Create Session' }: { text?: string }) {
  return (
    <Link href="/create">
      <Button size="lg" className="gap-1">
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          {text}
        </span>
      </Button>
    </Link>
  );
}
