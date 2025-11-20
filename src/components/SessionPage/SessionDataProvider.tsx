import { Suspense } from 'react';
import { fetchSessionData, SessionData } from '@/lib/hooks/useSessionData';
import ErrorPage from '@/components/Error';
import SessionPage from './index';
import { OpenAIMessage } from '@/lib/types';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { Spinner } from '@/components/ui/spinner';
interface SessionDataProviderProps {
  sessionId: string;
  workspaceId?: string;
  visibilityConfig?: ResultTabsVisibilityConfig;
  showShare?: boolean;
  chatEntryMessage?: OpenAIMessage;
}

async function SessionDataLoader({
  sessionId,
  workspaceId,
  visibilityConfig: defaultVisibilityConfig = {
    showSummary: true,
    showResponses: true,
    showCustomInsights: true,
    showChat: true,
    allowCustomInsightsEditing: true,
    showSessionRecap: true,
  },
  ...props
}: SessionDataProviderProps) {
  try {
    const data = await fetchSessionData(sessionId, workspaceId);
    
    // Use persisted settings if available, otherwise use defaults
    const visibilityConfig = data.visibilitySettings || defaultVisibilityConfig;
    
    return (
      <SessionPage
        data={data}
        visibilityConfig={visibilityConfig}
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
    <Suspense
      fallback={
        <div className="flex flex-row items-center justify-center min-h-[60vh] gap-3 text-center text-muted-foreground">
          <Spinner/>
          <p className="text-lg font-semibold">Loading session…</p>
        </div>
      }
    >
      <SessionDataLoader {...props} />
    </Suspense>
  );
} 