import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import { getHostSessions } from '@/lib/db';
import Link from 'next/link';
import { cache } from 'react';
import ErrorPage from '@/components/Error';

export const revalidate = 300;  // Revalidate the data every 5 minutes (or on page reload)
export const metadata = {
  title: 'Dashboard'
}

const sessionCache = cache(async () => {
  try {
    return await getHostSessions([
      'id',
      'topic',
      'start_time',
      'final_report_sent',
      'active',
    ]);
  } catch (error) {
    console.error("Failed to fetch host sessions: ", error);
    return undefined;
  }
})

export default async function Dashboard() {
  console.log('Loading session data')
  const hostSessions = await sessionCache();
  if (!hostSessions) {
    return <ErrorPage title={''} message={''} />
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
        <Link href="/create">
          <Button size="lg" className="gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Create Session
            </span>
          </Button>
        </Link>
      </div>
      <TabsContent value="all">
        <SessionsTable sessions={hostSessions} />
      </TabsContent>
    </Tabs>
  );
}
