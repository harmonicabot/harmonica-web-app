import { useState, useEffect, useRef } from 'react';
import { UserSession, HostSession } from '@/lib/schema';
import {
  analyzeWithSimScore,
  extractDataFromUserMessages,
} from 'app/api/exportUtils';
import { Spinner } from '@/components/icons';
import { useCustomResponses } from './hooks/useCustomResponses';
import { OpenAIMessage } from '@/lib/types';
import { HRMarkdown } from '@/components/HRMarkdown';
import { Card, CardContent } from '@/components/ui/card';

export function SimScoreTab({
  userData,
  resourceId,
}: {
  userData: UserSession[];
  hostData: HostSession;
  resourceId: string;
}) {
  const [generatingSimScore, setGenerating] = useState(false);
  const [simScoreResult, setSimScoreResult] = useState<string | null>(null);
  const { responses, addResponse, removeResponse, isLoading: isFetchingResults } =
    useCustomResponses(resourceId, 'SIMSCORE');

  // Add this ref to track if we need to generate a new SimScore
  const shouldGenerateRef = useRef(true);

  useEffect(() => {
    if (isFetchingResults) return;  // Still loading. Check later.
    if (responses.length > 0 && !simScoreResult) {
      // If we haven't previously set these results then set them now
      console.log('Found existing SimScore responses:', responses.length);
      // Use the first response as our SimScore result (there _should_ always only be one...)
      setSimScoreResult(responses[0].content);
      shouldGenerateRef.current = false; // Don't need to generate any more (in case rendering calls this again before results are updated)
    } else if (
      // Only generate if:
      !generatingSimScore &&    // 1. Generation isn't already in progress
      !simScoreResult &&        // 2. We don't already have a result
      responses.length === 0 && // 3. We have no existing responses
      shouldGenerateRef.current && // 4. We haven't already decided not to generate
      userData.length > 3       // 5. If there are at least 4 user entries
    ) {
      console.log('No SimScore found, generating...');
      shouldGenerateRef.current = false; // Prevent multiple generations
      generateSimScore();
    } else if ( // Update existing...
      !generatingSimScore &&
      responses.length > 0 &&
      userData.some(data => responses[0].created_at && data.last_edit > responses[0].created_at)
    ) {
      shouldGenerateRef.current = false;
      removeResponse(responses[0].id);
      generateSimScore();
    }
  }, [generatingSimScore, simScoreResult, isFetchingResults, responses]);

  const generateSimScore = async () => {
    setGenerating(true);
    try {
      // Default export instructions for SimScore
      const exportInstructions = `Extract a list of statements and their authors from all conversations.`;

      const adjustedExportInstructions = `${exportInstructions}
\n!IMPORTANT! Use the following JSON schema.\n
\`\`\`json\n 
[{ "author_id": "user_name", "idea": "idea1" }]
\`\`\`\n
ONLY include plain JSON in your reply, without any backticks, markdown formatting, or explanations!`;

      console.log('Starting SimScore extraction...');
      const extractedData = await extractDataFromUserMessages(
        userData,
        adjustedExportInstructions
      );

      console.log('Starting SimScore analysis...');
      const analyzed = await analyzeWithSimScore(extractedData);

      if (analyzed) {
        console.log('SimScore analysis complete, updating UI');
        const simScoreMessage: OpenAIMessage = {
          role: 'assistant',
          content: `## SimScore Analysis Results\n\n${analyzed}`,
        };

        // First update the local state for immediate UI feedback
        setSimScoreResult(simScoreMessage.content);

        // Then save to the database
        if (responses.length === 0) {
          console.log('Adding new SimScore to database');
          addResponse(simScoreMessage);
        } else {
          console.log('Replacing existing SimScore in database');
          removeResponse(responses[0].id);
          addResponse(simScoreMessage);
        }
      }
    } catch (error) {
      console.error('Error generating SimScore:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="pb-6 mb-4 relative">
      <CardContent className="max-h-[80vh] overflow-auto pb-0">
        <div className="p-4">
          {generatingSimScore || isFetchingResults ? (
            <div className="flex items-center justify-center p-8">
              <Spinner />
              <span className="ml-2">
                {generatingSimScore
                  ? 'Generating SimScore analysis...'
                  : 'Loading SimScore data...'}
              </span>
            </div>
          ) : simScoreResult ? (
            <div className="prose max-w-none">
              <HRMarkdown content={simScoreResult} />
            </div>
          ) : (
            <div className="text-center p-8">
              <p>No SimScore analysis available</p>
              <button
                onClick={() => {
                  shouldGenerateRef.current = true;
                  generateSimScore();
                }}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Generate SimScore Analysis
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
