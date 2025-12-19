import { notFound } from 'next/navigation';
import { getDbInstance, getAllChatMessagesInOrder } from '@/lib/db';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Session Transcript | Harmonica',
  robots: { index: false, follow: false },
};

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = await getDbInstance();

  // Validate token and get user_session_id
  const shareToken = await db
    .selectFrom('transcript_share_tokens')
    .where('token', '=', token)
    .selectAll()
    .executeTakeFirst();

  if (!shareToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900">Link Invalid</h1>
          <p className="text-gray-500 mt-2">
            This transcript link doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  // Fetch the specific user session (single participant)
  const userSession = await db
    .selectFrom('user_db')
    .where('id', '=', shareToken.user_session_id)
    .selectAll()
    .executeTakeFirst();

  if (!userSession) {
    notFound();
  }

  // Fetch parent session for topic
  const session = await db
    .selectFrom('host_db')
    .where('id', '=', userSession.session_id)
    .select(['topic'])
    .executeTakeFirst();

  // Fetch messages for THIS participant only
  const messages = await getAllChatMessagesInOrder(userSession.thread_id);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-3xl">
        <header className="mb-8 pt-8">
          <div className="flex items-center gap-3 mb-4">
            <img
              src="/harmonica.png"
              alt="Harmonica"
              className="h-8 w-auto"
            />
          </div>
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            Session Transcript
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {session?.topic || 'Session'}
          </h1>
          {userSession.user_name && (
            <p className="text-gray-600 mt-1">{userSession.user_name}</p>
          )}
        </header>

        <div className="space-y-4 pb-12">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-50 border border-blue-100 ml-8'
                  : 'bg-white border border-gray-200 mr-8 shadow-sm'
              }`}
            >
              <p className="text-xs font-medium text-gray-500 mb-2">
                {msg.role === 'user' ? 'You' : 'Harmonica'}
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))}
        </div>

        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages in this transcript.</p>
          </div>
        )}

        <footer className="border-t border-gray-200 pt-6 pb-8 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Harmonica. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
