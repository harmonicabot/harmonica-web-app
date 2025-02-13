import { analyzeQueryType } from './analyzeQueryType';
import { generateMultiSessionAnswer } from './monicaMultiSession';

export async function generateMonicaAnswer(
  sessionIds: string[],
  threadId: string,
  query: string,
) {
  try {
    // Analyze query type
    console.log(`[i] Analyzing query type...`)
    const queryClassification = await analyzeQueryType(query);
    console.log('[i] Query classification:', queryClassification);

    // Generate answer using multi-session approach
    const answer = await generateMultiSessionAnswer(
      sessionIds,
      threadId,
      query,
    );
    return answer;
  } catch (error) {
    console.error('[x] Error generating answer:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
