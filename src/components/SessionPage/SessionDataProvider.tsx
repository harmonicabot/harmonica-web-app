import { Suspense } from 'react';
import { fetchSessionData, SessionData } from '@/lib/hooks/useSessionData';
import ErrorPage from '@/components/Error';
import SessionPage from './index';
import { OpenAIMessage } from '@/lib/types';
import { ResultTabsVisibilityConfig } from '@/lib/schema';

interface SessionDataProviderProps {
  sessionId: string;
  workspaceId?: string;
  isPublicAccess?: boolean;
  visibilityConfig?: ResultTabsVisibilityConfig;
  showShare?: boolean;
  chatEntryMessage?: OpenAIMessage;
}

async function SessionDataLoader({
  sessionId,
  workspaceId,
  isPublicAccess,
  visibilityConfig: defaultVisibilityConfig = {
    showSummary: true,
    showParticipants: true,
    showCustomInsights: true,
    showChat: true,
    allowCustomInsightsEditing: true,
    showSessionRecap: true,
  },
  ...props
}: SessionDataProviderProps) {
  try {
    const data = await fetchSessionData(sessionId, workspaceId, isPublicAccess);
    
    // Use persisted settings if available, otherwise use defaults
    const baseConfig = data.visibilitySettings || defaultVisibilityConfig;
    
    // For public access, we show a more limited view
    const finalVisibilityConfig = isPublicAccess
      ? {
          showSummary: true,
          showParticipants: false,
          showCustomInsights: true,
          showChat: true,
          allowCustomInsightsEditing: false,
          showSessionRecap: true,
        }
      : baseConfig;

    return (
      <SessionPage
        data={data}
        visibilityConfig={finalVisibilityConfig}
        {...props}
      />
    );
  } catch (error) {
    console.error('Error loading session:', error);
    
    // If it's an access denied error, rethrow to use the error.tsx boundary
    if (error instanceof Error && error.message.includes('Access denied')) {
      throw error;
    }
    
    // For other errors, use the inline error component
    return (
      <ErrorPage
        title="Error loading session"
        message={error instanceof Error ? error.message : 'Session could not be loaded.'}
      />
    );
  }
}

export default function SessionDataProvider(props: SessionDataProviderProps) {
  return (
    <Suspense fallback={<div>Loading session data...</div>}>
      <SessionDataLoader {...props} />
    </Suspense>
  );
} 