'use server';

import { QdrantClient } from '@qdrant/js-client-rest';
import { Document, SentenceSplitter } from 'llamaindex';
import { OpenAIEmbedding } from 'llamaindex';
import { v4 as uuidv4 } from 'uuid';
import { getPostHogClient } from '@/lib/posthog-server';
import { getSession } from '@auth0/nextjs-auth0';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const embedModel = new OpenAIEmbedding({
  apiKey: process.env.OPENAI_API_KEY,
});

const textSplitter = new SentenceSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function processFileForQdrant({
  sessionId,
  fileContent,
  fileName,
  filePurpose,
}: {
  sessionId: string;
  fileContent: string;
  fileName: string;
  filePurpose: 'TRANSCRIPT' | 'KNOWLEDGE';
}) {
  const startTime = Date.now();
  try {
    const session = await getSession();
    const distinctId = session?.user?.sub || 'anonymous_server_user';

    // Split text into chunks
    const chunks = await textSplitter.splitText(fileContent);

    // Create documents with metadata
    const documents = chunks.map((chunk, index) => ({
      text: chunk,
      metadata: {
        session_id: sessionId,
        file_name: fileName,
        file_purpose: filePurpose,
        chunk_index: index,
        is_partial: chunks.length > 1,
      },
    }));

    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      documents.map(async (doc) => {
        const embedding = await embedModel.getTextEmbedding(doc.text);
        return {
          id: uuidv4(),
          vector: embedding,
          payload: {
            text: doc.text,
            ...doc.metadata,
          },
        };
      }),
    );

    // Store in Qdrant
    const collectionName = `session_${sessionId}_${filePurpose.toLowerCase()}`;

    // Check if collection exists first
    try {
      const collections = await qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === collectionName,
      );

      if (!collectionExists) {
        await qdrantClient.createCollection(collectionName, {
          vectors: {
            size: 1536, // OpenAI embedding size
            distance: 'Cosine',
          },
        });
        console.log(`Created new collection: ${collectionName}`);
      } else {
        console.log(`Using existing collection: ${collectionName}`);
      }
    } catch (error) {
      console.error('Error checking/creating collection:', error);
      throw new Error('Failed to initialize Qdrant collection');
    }

    // Upsert vectors in batches to avoid payload size limits
    const batchSize = 100;
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize);
      try {
        await qdrantClient.upsert(collectionName, {
          points: batch,
        });
        console.log(
          `Upserted batch ${i / batchSize + 1} of ${Math.ceil(embeddings.length / batchSize)}`,
        );
      } catch (error) {
        console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
        throw new Error('Failed to upsert vectors to Qdrant');
      }
    }

    const endTime = Date.now();
    const posthog = getPostHogClient();
    if (posthog) {
        posthog.capture({
            distinctId,
            event: '$ai_embedding',
            properties: {
                $ai_model: 'text-embedding-3-small', // Default for OpenAIEmbedding
                $ai_provider: 'openai',
                $ai_input_count: chunks.length,
                $ai_latency: (endTime - startTime) / 1000,
                $ai_status: 'success',
                file_name: fileName,
                file_purpose: filePurpose,
                session_id: sessionId
            }
        });
    }

    return { success: true, chunks: chunks.length };
  } catch (error) {
    console.error('Error processing file for Qdrant:', error);
    const posthog = getPostHogClient();
    if (posthog) {
        const session = await getSession();
        const distinctId = session?.user?.sub || 'anonymous_server_user';
        posthog.capture({
            distinctId,
            event: '$ai_embedding',
            properties: {
                $ai_model: 'text-embedding-3-small',
                $ai_provider: 'openai',
                $ai_status: 'error',
                $ai_error: error instanceof Error ? error.message : String(error),
                file_name: fileName,
                file_purpose: filePurpose,
                session_id: sessionId
            }
        });
    }
    throw error;
  }
}
