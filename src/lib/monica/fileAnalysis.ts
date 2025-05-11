import { getLLM } from '../modelConfig';

interface FileAnalysisResult {
  num_participants: number;
  num_messages: number;
  key_topics: string[];
}

export async function analyzeFileContent(content: string): Promise<FileAnalysisResult> {
  const chatEngine = getLLM('SMALL', 0.3);

  const analysisPrompt = `
Analyze the following content and extract key information. Return the result in JSON format with the following structure:
{
  "num_participants": number of unique participants,
  "num_messages": total number of messages,
  "key_topics": array of main topics discussed (max 5)
}

Content to analyze:
${content}
`;

  try {
    const response = await chatEngine.chat({
      messages: [
        {
          role: 'system',
          content: 'You are a precise content analyzer. Extract key metrics and topics from the provided content. Return only valid JSON.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    // Parse the response as JSON
    const analysisResult = JSON.parse(response) as FileAnalysisResult;
    return analysisResult;
  } catch (error) {
    console.error('Error analyzing file content:', error);
    // Return default values if analysis fails
    return {
      num_participants: 0,
      num_messages: 0,
      key_topics: [],
    };
  }
} 