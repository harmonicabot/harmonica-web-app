import { getLLM } from '../modelConfig';

interface FileAnalysisResult {
  num_participants: number;
  num_messages: number;
  key_topics: string[];
}

export async function analyzeFileContent(
  content: string,
): Promise<FileAnalysisResult> {
  try {
    // Use MAIN model for better analysis
    const chatEngine = getLLM('MAIN', 0.3);

    const analysisPrompt = `
Analyze the following content and extract key information. Return the result in JSON format with the following structure:
{
  "num_participants": number of unique participants,
  "num_messages": total number of messages,
  "key_topics": array of main topics discussed (max 5)
}

Content to analyze:
${content.substring(0, 4000)} // Limit content length to avoid token limits
`;

    console.log('[i] Starting file content analysis');
    const response = await chatEngine.chat({
      messages: [
        {
          role: 'system',
          content:
            'You are a precise content analyzer. Extract key metrics and topics from the provided content. Return only valid JSON without any markdown formatting.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    console.log('[i] Raw analysis response:', response);

    // Clean the response - remove markdown code blocks if present
    const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    console.log('[i] Cleaned response:', cleanedResponse);

    // Parse the response as JSON
    const analysisResult = JSON.parse(cleanedResponse) as FileAnalysisResult;
    console.log('[i] Parsed analysis result:', analysisResult);

    return analysisResult;
  } catch (error) {
    console.error('[e] Error analyzing file content:', error);
    // Return default values if analysis fails
    return {
      num_participants: 0,
      num_messages: 0,
      key_topics: [],
    };
  }
}
