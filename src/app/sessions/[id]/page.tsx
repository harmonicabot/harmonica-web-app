import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface';
import { getGeneratedMetadata } from 'app/api/metadata';
import { decryptId } from '@/lib/encryptionUtils';
import SessionDataProvider from '@/components/SessionPage/SessionDataProvider';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { access } from 'fs';

// Increase the maximum execution time for this function on vercel
export const maxDuration = 60; // in seconds
export const revalidate = 5 * 60; // check new data only every 5 minutes

export async function generateMetadata(
  { params }: { params: { id: string } } ,
): Promise<Metadata> {
  return getGeneratedMetadata(`/sessions/${params.id}`);
}

export default async function SessionResult({
  params,
}: {
  params: { id: string };
}) {
  const decryptedId = decryptId(params.id);

  const visibilityConfig: ResultTabsVisibilityConfig = {
    showSummary: true,
    showResponses: true,
    showCustomInsights: true,
    showChat: true,
    allowCustomInsightsEditing: true,
  };

  return (
    <SessionDataProvider
      sessionId={decryptedId}
      showShare={true}
      visibilityConfig={visibilityConfig}
    />
  );
}