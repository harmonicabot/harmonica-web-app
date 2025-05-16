import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbedding } from 'llamaindex';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const embedModel = new OpenAIEmbedding({
  apiKey: process.env.OPENAI_API_KEY,
});

export type FilePurpose = 'TRANSCRIPT' | 'KNOWLEDGE';

export async function queryQdrantCollection(
  sessionId: string,
  purpose: FilePurpose,
  query: string,
  limit: number = 5,
) {
  try {
    const collectionName = `session_${sessionId}_${purpose.toLowerCase()}`;
    console.log(`[i] Querying Qdrant collection: ${collectionName}`);

    // Generate query embedding
    const queryEmbedding = await embedModel.getTextEmbedding(query);

    // Search in Qdrant
    const searchResult = await qdrantClient.search(collectionName, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
    });

    if (searchResult.length === 0) {
      console.log(
        `[i] No relevant ${purpose.toLowerCase()} content found in Qdrant`,
      );
      return null;
    }

    // Combine the most relevant chunks
    const content = searchResult
      .map((result) => result.payload?.text)
      .filter(Boolean)
      .join('\n\n');

    console.log(
      `[i] Successfully retrieved ${purpose.toLowerCase()} content from Qdrant`,
    );
    return content;
  } catch (error) {
    console.error(
      `[x] Error querying Qdrant for ${purpose.toLowerCase()}:`,
      error,
    );
    return null;
  }
}

export async function getSessionContent(
  sessionId: string,
  query: string,
  purposes: FilePurpose[] = ['TRANSCRIPT', 'KNOWLEDGE'],
) {
  try {
    const results: Record<FilePurpose, string | null> = {
      TRANSCRIPT: null,
      KNOWLEDGE: null,
    };

    // Query each purpose type
    for (const purpose of purposes) {
      results[purpose] = await queryQdrantCollection(sessionId, purpose, query);
    }

    return results;
  } catch (error) {
    console.error('[x] Error getting session content:', error);
    return null;
  }
}
