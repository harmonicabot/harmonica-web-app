import { OpenAI as LlamaOpenAI } from 'llamaindex';

export type QueryClassification = {
  type: 'analytical' | 'specific';
  confidence: number;
};

export async function analyzeQueryType(
  query: string,
): Promise<QueryClassification> {
  const classificationModel = new LlamaOpenAI({
    model: 'gpt-3.5-turbo', // Using smaller model for classification
    temperature: 0, // Zero temperature for consistent results
    apiKey: process.env.OPENAI_API_KEY,
  });

  const classificationPrompt = `Analyze if this question requires RAG (specific) or analytical processing: "${query}"

    Follow these steps:
    1. Does the question ask for:
       - Finding specific information or quotes? -> specific (use RAG)
       - Looking up particular events or details? -> specific (use RAG)
       - Searching for examples or mentions? -> specific (use RAG)
       OR
       - Counting or aggregating data? -> analytical
       - Finding patterns or trends? -> analytical
       - Comparing or analyzing across messages? -> analytical
    
    2. Quick test:
       - Can it be answered by finding relevant passages? -> specific
       - Does it need to process multiple messages together? -> analytical
    
    3. Examples:
       - "Find messages about product feedback" -> specific (RAG can find relevant passages)
       - "What's the distribution of sentiment?" -> analytical (needs to process all data)
       - "Show me discussions about pricing" -> specific (RAG can retrieve relevant parts)
       - "What topics come up most often?" -> analytical (requires counting across all data)

    Return only a JSON object: {"type":"analytical"|"specific","confidence":0.0-1.0}`;

  try {
    const classificationResponse = await classificationModel.complete({
      prompt: classificationPrompt,
    });

    const queryClassification = JSON.parse(
      classificationResponse.text as string,
    ) as QueryClassification;
    return queryClassification;
  } catch (error) {
    console.error('[x] Failed to analyze query type:', error);
    return { type: 'specific', confidence: 0.5 };
  }
}
