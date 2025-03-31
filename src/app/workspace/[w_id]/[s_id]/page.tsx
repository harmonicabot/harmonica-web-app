import { decryptId } from '@/lib/encryptionUtils';
import SessionDataProvider from '@/components/SessionPage/SessionDataProvider';
import { ResultTabsVisibilityConfig } from '@/lib/schema';

export const maxDuration = 300; // in seconds

export default async function WorkspaceSessionResult({
  params,
  searchParams,
}: {
  params: { w_id: string; s_id: string };
  searchParams: { access?: string };
}) {
  const decryptedId = decryptId(params.s_id);

  const visibilityConfig: ResultTabsVisibilityConfig = {
    showSummary: true,
    showSessionRecap: false,
    showResponses: true,
    showCustomInsights: true,
    showChat: true,
    allowCustomInsightsEditing: true,
  };

  return (
    <SessionDataProvider
      sessionId={decryptedId}
      workspaceId={params.w_id}
      isPublicAccess={searchParams?.access === 'public'}
      visibilityConfig={visibilityConfig}
      showShare={false}
      chatEntryMessage={{
        role: 'assistant',
        content: `Bienvenue au Sommet IA de l'ENS-PSL! Je suis là pour vous aider à comprendre les enseignements des discussions précédentes.

Voici quelques questions que vous pourriez poser :
  - Quels ont été les thèmes principaux abordés lors de cette session ?
  - Comment les participants ont-ils perçu le rôle de l'IA dans le [sujet] ?
  - Quelles étaient les principales préoccupations concernant l'adoption de l'IA ?
  
You can also ask me in any other language, and I will try my best to reply in your language. (However, I might not always get that right 😅)`
      }}
    />
  );
}
