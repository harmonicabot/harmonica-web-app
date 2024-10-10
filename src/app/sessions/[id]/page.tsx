'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/stores/SessionStore';
import Markdown from 'react-markdown';
import { format } from 'date-fns';

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
import Chat from '@/components/chat';
import QRCode from 'qrcode.react';
import { Calendar, Eye, Settings, Share2, User } from 'lucide-react';

export default function SessionResult() {
  const { id } = useParams() as { id: string };
  const [loadSummary, setLoadSummary] = useState(false);
  const [userData, setUserData] = useState([]);
  const [accumulated, setAccumulated] = useSessionStore((state) => [
    state.accumulated[id],
    state.addAccumulatedSessions,
  ]);

  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
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
    setUserData(data.user_data);
    setAccumulated(id, accumulateSessionData(data));
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(
        `${window.location.origin}/chat?s=${accumulated.session_data.session_id}`,
      )
      .then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  function extractKeyTakeaways(summary: string): string {
    // Regular expression to match text between "Key Takeaways" and "📝 Details"
    const regex = /Key Takeaways([\s\S]*?)Details/;

    // Extract the matched text
    const match = summary.match(regex);

    if (match && match[1]) {
      return cleanedText(match[1]);
    } else {
      return 'No match found';
    }
  }

  function cleanedText(text: string): string {
    return text
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\*]/gu,
        '',
      )
      .trim();
  }

  function extractDetails(summary: string): string {
    // Regular expression to match text after "Details"
    const regex = /Details([\s\S]*)/;

    // Extract the matched text
    const match = summary.match(regex);

    if (match && match[1]) {
      // Remove all emojis and asterisks from the extracted text
      return cleanedText(match[1]);
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

  const finishSession = async () => {
    await createSummary();
    await sendFinalReport();
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
      <div className="flex mb-6 align-items-center">
        <h1 className="text-3xl font-bold">
          {accumulated?.session_data?.topic
            ? accumulated.session_data.topic
            : 'Session name'}
        </h1>
        {accumulated.session_data.finalReportSent ? (
          <Badge variant="outline" className="text-purple-900 bg-purple-100 ms-4">
            Finished
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-lime-100 text-lime-900 ms-4">
            Active
          </Badge>
        )}
      </div>
      <div className="flex gap-4">
        {!accumulated.session_data.finalReportSent && (
          <Card className="flex-grow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-md">Session Controls</CardTitle>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {accumulated.session_data.finalReportSent ? (
                <p>Session finished</p>
              ) : (
                <div>
                  <Button
                    className="me-2"
                    onClick={finishSession}
                    disabled={loadSummary}
                  >
                    Finish session
                  </Button>
                  {/* <Button variant="secondary">Cancel session</Button> */}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <div className="flex flex-grow gap-4">
          <Card className="flex-grow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-md">Status</CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {accumulated.session_data.finalReportSent ? (
                <Badge variant="outline" className="text-purple-900 bg-purple-100 mb-3">
                  Finished
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-lime-100 text-lime-900 mb-3"
                >
                  Active
                </Badge>
              )}
              <p> Started on
                <span className="font-medium"> {format(accumulated.session_data.start_time, ' dd MMM yyyy')}</span>
              </p>
            </CardContent>
          </Card>
          <Card className="flex-grow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-md">Participants</CardTitle>
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p><span className="font-medium">{accumulated.session_data.num_sessions}</span> <span className="text-yellow-800">Started</span></p>
              <p><span className="font-medium">{accumulated.session_data.active}</span> <span className="text-lime-800">Completed</span></p>
            </CardContent>
          </Card>
        </div>

        {!accumulated.session_data.finalReportSent && (
          <Card className="flex-grow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-md">Share</CardTitle>
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <Button className="me-2" onClick={copyToClipboard}>
                  Copy link
                </Button>
                {showToast && (
                  <div className="fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded shadow-lg">
                    URL copied to clipboard
                  </div>
                )}
                <Button variant="outline" onClick={toggleModal}>
                  Show QR Code Image
                </Button>
                {isModalOpen && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="relative bg-white p-4 rounded shadow-lg">
                      <QRCode
                        className="m-4"
                        size={250}
                        value={`${window.location.origin}/chat?s=${accumulated.session_data.session_id}`}
                      />
                      <button
                        className="absolute -top-14 -right-14 bg-white text-gray-500 text-2xl w-12 h-12 flex items-center justify-center rounded-full shadow-lg"
                        onClick={toggleModal}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
      <Tabs
        className="mb-4"
        defaultValue={
          accumulated.session_data.finalReportSent ? 'SUMMARY' : 'RESPONSES'
        }
      >
        <TabsList>
          {accumulated.session_data.finalReportSent && (
            <TabsTrigger className="ms-0" value="SUMMARY">
              Summary
            </TabsTrigger>
          )}
          <TabsTrigger className="ms-0" value="RESPONSES">
            Responses
          </TabsTrigger>
        </TabsList>
        <TabsContent value="SUMMARY">
          <div className="mt-4">
            <div className="flex gap-4">
              <div className="w-2/3">
                {/* <Card>
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
                </div> */}
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md">Your Report</CardTitle>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {accumulated.session_data.summary && (
                      <>
                        <p className="text-xl font-semibold mb-2">Summary</p>
                        <Markdown
                          components={{
                            p: ({ node, ...props }) => <p className="text-base mb-3 last:mb-0" {...props} />,
                            ul: ({ node, ...props }) => <ul className="my-2 ml-4 list-disc" {...props} />,
                            ol: ({ node, ...props }) => <ol className="my-2 ml-4 list-decimal" {...props} />,
                            li: ({ node, ...props }) => <li className="text-base mb-1" {...props} />,
                            h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-5 mb-3" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-lg font-medium mt-3 mb-2" {...props} />,
                            h5: ({ node, ...props }) => <h5 className="text-base font-medium mt-2 mb-1" {...props} />,
                            h6: ({ node, ...props }) => <h6 className="text-sm font-medium mt-2 mb-1" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 italic my-4" {...props} />,
                            a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                            em: ({ node, ...props }) => <em className="italic" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-6 border-t border-gray-300" {...props} />,
                          }}
                        >
                          {extractKeyTakeaways(
                            accumulated.session_data.summary,
                          )}
                        </Markdown>
                        <p className="text-xl font-semibold mt-6 mb-2">Key Takeaways</p>
                        <Markdown
                          components={{
                            p: ({ node, ...props }) => <p className="text-base mb-3 last:mb-0" {...props} />,
                            ul: ({ node, ...props }) => <ul className="my-2 ml-4 list-disc" {...props} />,
                            ol: ({ node, ...props }) => <ol className="my-1 ml-4 list-decimal" {...props} />,
                            li: ({ node, ...props }) => <li className="text-base mb-1" {...props} />,
                            h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-5 mb-3" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-lg font-medium mt-3 mb-2" {...props} />,
                            h5: ({ node, ...props }) => <h5 className="text-base font-medium mt-2 mb-1" {...props} />,
                            h6: ({ node, ...props }) => <h6 className="text-sm font-medium mt-2 mb-1" {...props} />,
                            a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                            em: ({ node, ...props }) => <em className="italic" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-6 border-t border-gray-300" {...props} />,
                          }}
                        >
                          {extractDetails(accumulated.session_data.summary)}
                        </Markdown>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="w-1/3 gap-4">
                <Card className="bg-purple-100 border-purple-200 h-auto">
                  <CardHeader>
                    <CardTitle className="text-md">Ask Monica</CardTitle>
                  </CardHeader>
                  <CardContent className="h-auto">
                    {userData && userData.length && (
                      <Chat
                    userNameInFirstMessage={false}
                    context={{
                      role: 'assistant',
                      content: `You will be asked questions based on the session data. Answer short. The context of the session is: ${userData.map((user) => user.chat_text).join(' --- next USER ---')}

                     ------------`,
                    }}
                    assistantId="asst_LQospxVfX4vMTONASzSkSUwb"
                    entryMessage={{
                      type: 'ASSISTANT',
                      text: `Hi there! Consider me your expert analyst, I can help you to better understand your session.

Here are a few examples of what you can ask me:
  - What was the most common response?
  - What were the most interesting insights?
  - Generate a report on the session
                    `,
                    }}
                  />
                )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="RESPONSES">
          <Card className="mt-4 w-2/3">
            <CardHeader>
              <CardTitle className="text-xl">Participants</CardTitle>
              <CardDescription>View participants progress and transcripts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    {/* <TableHead className="hidden md:table-cell">
                      Include in summary
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Started at
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Finished at
                    </TableHead> */}
                    <TableHead></TableHead>
                    {/* <TableHead></TableHead> */}
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
