import { Suspense } from 'react';
import { fetchSessionData, SessionData } from '@/lib/hooks/useSessionData';
import ErrorPage from '@/components/Error';
import SessionPage from './index';
import { OpenAIMessage, ResultTabsVisibilityConfig } from '@/lib/types';

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
        workspaceId={workspaceId}
        isPublicAccess={isPublicAccess}
        visibilityConfig={finalVisibilityConfig}
        {...props}
      />
    );
  } catch (error) {
    console.error('Error loading session:', error);
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