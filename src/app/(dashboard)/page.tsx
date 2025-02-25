import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionsTable } from './sessions-table';
import { WorkspacesTable } from './workspaces-table';
import { getHostSessions } from '@/lib/db';
import Link from 'next/link';
import { cache } from 'react';
import ErrorPage from '@/components/Error';
import { getGeneratedMetadata } from 'app/api/metadata';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { HostSession } from '@/lib/schema';

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

interface Workspace {
  id: string;
  title: string;
  description: string;
  created_at: string;
  num_sessions: number;
  num_participants: number;
  sessions?: HostSession[];
}

const defaultVisibilityConfig = {
  showSummary: true,
  showParticipants: true,
  showCustomInsights: true,
  showChat: true,
  allowCustomInsightsEditing: true,
  showSessionRecap: true,
};

const mockSessions = [
  {
    id: "session-1",
    topic: "AI in Education",
    active: true,
    start_time: new Date("2024-02-20T10:00:00Z"),
    final_report_sent: false,
    prompt: "Discuss the role of AI in education",
    assistant_id: "asst_1",
    template_id: undefined,
    summary_assistant_id: "asst_sum_1",
    goal: "Understand the impact of AI on education",
    critical: "Identify potential risks and challenges",
    context: "Current state of AI in education",
    summary: "Key insights about AI in education",
    num_sessions: 1,
    num_finished: 0,
    prompt_summary: "Discussion about AI's role in education",
    is_public: false,
    questions: undefined,
    last_edit: new Date(),
    visibility_settings: defaultVisibilityConfig,
    client: "auth0|1",
  },
  {
    id: "session-2",
    topic: "Future of Work",
    active: false,
    start_time: new Date("2024-02-19T14:00:00Z"),
    final_report_sent: true,
    prompt: "Explore how AI will transform work",
    assistant_id: "asst_2",
    template_id: undefined,
    summary_assistant_id: "asst_sum_2",
    goal: "Understand future workplace changes",
    critical: "Address workforce adaptation",
    context: "Current workplace trends",
    summary: "Key insights about future work",
    num_sessions: 1,
    num_finished: 1,
    prompt_summary: "Discussion about future workplace transformation",
    is_public: false,
    questions: undefined,
    last_edit: new Date(),
    visibility_settings: defaultVisibilityConfig,
    client: "auth0|1",
  },
  {
    id: "session-3",
    topic: "AI Ethics",
    active: true,
    start_time: new Date("2024-02-21T09:00:00Z"),
    final_report_sent: false,
    prompt: "Discuss ethical considerations in AI",
    assistant_id: "asst_3",
    template_id: undefined,
    summary_assistant_id: "asst_sum_3",
    goal: "Explore ethical implications",
    critical: "Identify key ethical challenges",
    context: "Current ethical frameworks",
    summary: "Key insights about AI ethics",
    num_sessions: 1,
    num_finished: 0,
    prompt_summary: "Discussion about AI ethics",
    is_public: false,
    questions: undefined,
    last_edit: new Date(),
    visibility_settings: defaultVisibilityConfig,
    client: "auth0|1",
  }
];

const mockWorkspaces = [
  {
    id: "ENS-PSL",
    title: "Assemblée étudiante sur l'IA",
    description: "Explorer ensemble les enjeux liés à l'IA et faire des propositions d'actions pour un développement de l'IA au service du bien commun.",
    created_at: "2024-01-15",
    num_sessions: 3,
    num_participants: 45,
    sessions: [
      {
        id: "session-1",
        topic: "L'IA dans l'éducation supérieure",
        active: true,
        start_time: new Date("2024-01-20T14:00:00Z"),
        final_report_sent: false,
        prompt: "Discuss the role of AI in higher education",
        assistant_id: "asst_1",
        template_id: undefined,
        summary_assistant_id: "sum_asst_1",
        goal: "Explore the impact of AI on higher education",
        client: "auth0|1",
        num_sessions: 15,
        num_finished: 10,
        is_public: false,
        prompt_summary: "Discussion on AI in higher education",
        last_edit: new Date("2024-01-20T14:00:00Z"),
        summary: undefined,
        critical: undefined,
        context: undefined,
        questions: undefined
      },
      {
        id: "session-2",
        topic: "Éthique et gouvernance de l'IA",
        active: false,
        start_time: new Date("2024-01-25T15:30:00Z"),
        final_report_sent: true,
        prompt: "Discuss AI ethics and governance",
        assistant_id: "asst_2",
        template_id: undefined,
        summary_assistant_id: "sum_asst_2",
        goal: "Define ethical guidelines for AI development",
        client: "auth0|1",
        num_sessions: 18,
        num_finished: 18,
        is_public: false,
        prompt_summary: "Discussion on AI ethics",
        last_edit: new Date("2024-01-25T15:30:00Z"),
        summary: undefined,
        critical: undefined,
        context: undefined,
        questions: undefined
      },
      {
        id: "session-3",
        topic: "Impact sociétal de l'IA",
        active: true,
        start_time: new Date("2024-02-01T10:00:00Z"),
        final_report_sent: false,
        prompt: "Explore societal impacts of AI",
        assistant_id: "asst_3",
        template_id: undefined,
        summary_assistant_id: "sum_asst_3",
        goal: "Understand AI's broader impact on society",
        client: "auth0|1",
        num_sessions: 12,
        num_finished: 8,
        is_public: false,
        prompt_summary: "Discussion on societal AI impact",
        last_edit: new Date("2024-02-01T10:00:00Z"),
        summary: undefined,
        critical: undefined,
        context: undefined,
        questions: undefined
      }
    ]
  },
  {
    id: "climate",
    title: "Climate Change Summit",
    description: "A series of discussions about climate change",
    created_at: "2024-02-18",
    last_modified: new Date(),
    num_sessions: 2,
    num_participants: 15,
    sessions: [
      {
        id: "climate-1",
        topic: "Renewable Energy",
        active: true,
        start_time: new Date("2024-02-22T13:00:00Z"),
        final_report_sent: false,
        prompt: "Discuss renewable energy solutions",
        assistant_id: "asst_4",
        template_id: undefined,
        summary_assistant_id: "asst_sum_4",
        goal: "Explore renewable energy options",
        critical: "Address implementation challenges",
        context: "Current energy landscape",
        summary: "Key insights about renewable energy",
        num_sessions: 1,
        num_finished: 0,
        prompt_summary: "Discussion about renewable energy solutions",
        is_public: false,
        questions: undefined,
        last_edit: new Date(),
        visibility_settings: defaultVisibilityConfig,
        client: "auth0|1",
      },
      {
        id: "climate-2",
        topic: "Carbon Capture",
        active: false,
        start_time: new Date("2024-02-21T15:00:00Z"),
        final_report_sent: true,
        prompt: "Explore carbon capture technologies",
        assistant_id: "asst_5",
        template_id: undefined,
        summary_assistant_id: "asst_sum_5",
        goal: "Understand carbon capture methods",
        critical: "Evaluate effectiveness",
        context: "Current carbon capture tech",
        summary: "Key insights about carbon capture",
        num_sessions: 1,
        num_finished: 1,
        prompt_summary: "Discussion about carbon capture technologies",
        is_public: false,
        questions: undefined,
        last_edit: new Date(),
        visibility_settings: defaultVisibilityConfig,
        client: "auth0|1",
      }
    ]
  }
];

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
        (session) => session.client === 'auth0|679de14aa9e0c4faa3b80ac2'
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
      <Tabs defaultValue="sessions">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your sessions and workspaces
            </p>
          </div>
          <div className="flex items-center space-x-2">
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
            <CreateSessionButton />
            <CreateWorkspaceButton />
          </div>
        </div>

        <TabsList className="mt-6">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            Sessions
            {hostSessions.length > 0 && (
              <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {hostSessions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="flex items-center gap-2">
            Workspaces
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {mockWorkspaces.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          {hostSessions.length > 0 ? (
            <SessionsTable sessions={hostSessions} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-6">
                <CreateSessionButton text="Create Your First Session" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workspaces" className="mt-4">
          {mockWorkspaces.length > 0 ? (
            <WorkspacesTable workspaces={mockWorkspaces} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-6">
                <CreateWorkspaceButton text="Create Your First Workspace" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function CreateSessionButton({ text = 'Create Session' }: { text?: string }) {
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

function CreateWorkspaceButton({ text = 'Create Workspace' }: { text?: string }) {
  return (
    <Link href="/workspace/create">
      <Button size="lg" className="gap-1">
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          {text}
        </span>
      </Button>
    </Link>
  );
}