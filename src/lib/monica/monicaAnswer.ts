import { OpenAIMessage } from '../types';
import { analyzeQueryType } from './analyzeQueryType';
import { generateMultiSessionAnswer } from './monicaMultiSession';

export async function generateMonicaAnswer(
  sessionIds: string[],
  chatHistory: OpenAIMessage[],
  query: string
) {
  try {
    // Analyze query type
    // console.log(`[i] Analyzing query type...`)
    // const queryClassification = await analyzeQueryType(query);
    // console.log('[i] Query classification:', queryClassification);

    // TODO: queryClassification is currently unused, but I assume we want to use it at some point to decide
    //        between specific vs analytical (I think multi-session is a general-purpose method at this point?)

    // Generate answer using multi-session approach
    const answer = await generateMultiSessionAnswer(
      sessionIds,
      chatHistory,
      query,
    );
    return answer;
  } catch (error) {
    console.error('[x] Error generating answer:', error);
    return `I apologize, but I encountered an error processing your request. ${error}`;
  }
}
