'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import Markdown from 'react-markdown';
import {
  accumulateSessionData,
  sendApiCall,
  sendCallToMake,
} from '@/lib/utils';
import { ApiAction, ApiTarget } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Settings, Share, User } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tabs, TabsContent } from '@radix-ui/react-tabs';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ParticipantSessionCell from './participant-session-cell';
import Chat from '@/components/Chat';

export default function DashboardIndividual() {
  const { id } = useParams() as { id: string };
  const [loadSummary, setLoadSummary] = useState(false);
  const [userData, setUserData] = useState([]);
  const [accumulated, setAccumulated] = useSessionStore((state) => [
    state.accumulated[id],
    state.addAccumulatedSessions,
  ]);

  useEffect(() => {
    console.log('useEffect triggered to fetch session data for ', id);
    if (!accumulated) {
      console.log('No data in store, fetching...');
      // Fetch data from the database if not in store
      fetchSessionData();
    } else {
      console.log('Session data found in store', accumulated);
    }
  }, [id, accumulated]);

  const fetchSessionData = async () => {
    console.log(`Fetching session data for ${id}...`);
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.Stats,
      data: {
        session_id: id,
      },
    });
    console.log(data.user_data);
    setUserData(data.user_data);
    setAccumulated(id, accumulateSessionData(data));
  };

  function extractKeyTakeaways(summary: string): string {
    // Regular expression to match text between "Key Takeaways" and "📝 Details"
    const regex = /Key Takeaways([\s\S]*?)Details/;

    // Extract the matched text
    const match = summary.match(regex);

    if (match && match[1]) {
      const cleanedText = match[1]
        .replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\*]/gu,
          '',
        )
        .trim();
      return cleanedText;
    } else {
      return 'No match found';
    }
  }

  function extractDetails(summary: string): string {
    // Regular expression to match text after "Details"
    const regex = /Details([\s\S]*)/;

    // Extract the matched text
    const match = summary.match(regex);

    if (match && match[1]) {
      // Remove all emojis and asterisks from the extracted text
      const cleanedText = match[1]
        .replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\*]/gu,
          '',
        )
        .trim();
      return cleanedText;
    } else {
      return 'No match found';
    }
  }

  const sendFinalReport = async () => {
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.SendFinalReport,
      data: {
        session_id: id,
      },
    });
    await fetchSessionData();
  };

  const createSummary = async () => {
    console.log(`Creating summary for ${id}...`);
    setLoadSummary(true);
    const data = await sendCallToMake({
      target: ApiTarget.Session,
      action: ApiAction.CreateSummary,
      data: {
        session_id: id,
        finished: accumulated.session_data.finished,
      },
    });
    await fetchSessionData();
  };

  useEffect(() => {
    if (accumulated?.session_data.summary) {
      setLoadSummary(false);
    }
  }, [accumulated?.session_data.summary]);

  const handleDelete = async () => {
    console.log(`Deleting session ${id}...`);
    const data = await sendApiCall({
      target: ApiTarget.Session,
      action: ApiAction.DeleteSession,
      data: {
        session_id: id,
      },
    });
    console.log(data);
    window.location.href = '/';
  };

  if (!accumulated) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex  mb-4">
        <h1 className="text-2xl font-bold">
          {accumulated?.session_data?.topic
            ? accumulated.session_data.topic
            : 'Session name'}
        </h1>
        <Badge variant="outline" className="bg-[#ECFCCB] text-black ms-4">
          Active
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle className="text-md">Session Controls</CardTitle>
              <Settings />
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <Button className="me-2">Finish session</Button>
              <Button variant="secondary">Cancel session</Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle className="text-md">Status</CardTitle>
                <Calendar />
              </div>
            </CardHeader>
            <CardContent>
              <p>17th June 2024</p>
              <Badge variant="outline" className="bg-[#ECFCCB] text-black mt-2">
                Active
              </Badge>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle className="text-md">Participants</CardTitle>
                <User />
              </div>
            </CardHeader>
            <CardContent>
              <p>{accumulated.session_data.num_sessions} Started</p>
              <p>{accumulated.session_data.active} Completed</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle className="text-md">Session controls</CardTitle>
              <Share />
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <Button className="me-2">Share link</Button>
              <Button variant="outline">Copy QR Code Image</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <h3 className="text-2xl font-bold mb-4 mt-4">Results</h3>
      <Tabs className="mb-4" defaultValue="SUMMARY">
        <TabsList>
          <TabsTrigger className="ms-0" value="SUMMARY">
            Summary
          </TabsTrigger>
          <TabsTrigger className="ms-0" value="RESPONSES">
            Responses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="SUMMARY">
          <div className="mt-4">
            <div className="flex gap-4">
              <div className="w-2/3">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle className="text-md">Key Stats</CardTitle>
                      <Settings />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>126</CardTitle>
                          <CardDescription>Messages</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>14</CardTitle>
                          <CardDescription>
                            Ave. words per response
                          </CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            {accumulated.session_data.active}
                          </CardTitle>
                          <CardDescription>Finished</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex mt-4 gap-4">
                  <div className="flex flex-col w-1/2 gap-4">
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between">
                          <CardTitle className="text-md">
                            Results Summary
                          </CardTitle>
                          <Settings />
                        </div>
                      </CardHeader>
                      <CardContent>
                        Reflect on your overall experience today. What aspects
                        of the conference worked well? Are there any suggestions
                        for improvement or topics you'd like to see addressed in
                        upcoming sessions?
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between">
                          <CardTitle className="text-md">Sentiments</CardTitle>
                          <Settings />
                        </div>
                      </CardHeader>
                      <CardContent>
                        The tone of participants was optimisic though they
                        shared concern
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="w-1/2">
                    <CardHeader>
                      <div className="flex justify-between">
                        <CardTitle className="text-md">Key takeaways</CardTitle>
                        <Settings />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {accumulated.session_data.summary && (
                        <>
                          <Markdown>
                            {extractKeyTakeaways(
                              accumulated.session_data.summary,
                            )}
                          </Markdown>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-4">
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle className="text-md">In detail</CardTitle>
                      <Eye />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accumulated.session_data.summary && (
                      <>
                        <Markdown>
                          {extractDetails(accumulated.session_data.summary)}
                        </Markdown>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="w-1/3 gap-4">
                {userData && userData.length && (
                  <Chat
                    context={`You will be asked questions based on the session data. The context of the session is: ${userData.map((user) => user.chat_text).join(' --- next USER ---')}
                  
                  ------------`}
                    dontShowFirstMessage={true}
                    assistantId="asst_LQospxVfX4vMTONASzSkSUwb"
                    entryMessage={{
                      type: 'ASSISTANT',
                      text: `Hi there, you can ask my anything about the session.

Here’s some examples
  - What was the most common response?
  - What were the most interesting insights?
  - Create a graph that maps the responses of participants
                    `,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="RESPONSES">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>Manage your sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Include in summary
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Started at
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Finished at
                    </TableHead>
                    <TableHead></TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData.map((session) => (
                    <ParticipantSessionCell session={session} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
