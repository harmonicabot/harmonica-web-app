import { cache, useEffect } from 'react';
import * as db from '@/lib/db';
import * as utils from '@/lib/utils';
import SessionResultHeader, {
  SessionStatus,
} from '@/components/SessionResult/SessionResultHeader';
import SessionResultsSection from '@/components/SessionResult/SessionResultsSection';
import { decryptId } from '@/lib/encryptionUtils';
import ErrorPage from '@/components/Error';
import {
  Metadata,
  ResolvingMetadata,
} from 'next/dist/lib/metadata/types/metadata-interface';
import SessionResultsOverview from '@/components/SessionResult/SessionResultsOverview';
import { useSessionStore } from '@/stores/SessionStore';
import { HostSession, UserSession } from '@/lib/schema_updated';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

export async function generateMetadata(
  { params }: { params: { id: string } } ,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = params;
  const decryptedId = decryptId(id);
  console.log(`Encrypted in Metadata: ${id}, Decrypted: ${decryptedId}`)
  const hostData = await db.getHostSessionById(decryptedId);
  
  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];
  return {
    title: hostData.topic,
    openGraph: {
      images: ['/some-specific-page-image.jpg', ...previousImages],
    },
  };
}

export default async function SessionResult({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const decryptedId = decryptId(id);
  console.log(`Encrypted: ${id}, Decrypted: ${decryptedId}`)

  try {
    const hostData = await db.getHostSessionById(decryptedId);
    const userData = await db.getUsersBySessionId(decryptedId);

    const sessionsWithChat = await db.filterForUsersWithMessages(userData)
    const numSessions = sessionsWithChat.length;
    const completedSessions = sessionsWithChat.filter((user) => !user.active).length;

    if (!hostData)
      return (
        <ErrorPage
          title={`No data available for ${id}`}
          message="Looks like the provided SessionID is invalid or was deleted."
        />
      );

    return (
        <div className="p-4 md:p-8">
          <SessionResultHeader
            topic={hostData.topic}
            status={
              !hostData.active
                ? SessionStatus.REPORT_SENT
                : SessionStatus.ACTIVE
            }
          />
          <SessionResultsOverview
            id={hostData.id}
            active={hostData.active}
            startTime={hostData.start_time}
            numSessions={numSessions}
            completedSessions={completedSessions}
          />
          <SessionResultsSection
            hostData={hostData}
            userData={sessionsWithChat}
            id={hostData.id}
          />
        </div>
    );
  } catch (error) {
    console.error(`Error occured fetching data: `, error);
    return (
      <ErrorPage
        title={'Error loading session'}
        message={
          'The session ID might be incorrect or the session may no longer exist.'
        }
      />
    );
  }
}