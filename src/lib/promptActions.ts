'use server';

import { cache } from 'react';
import { DEFAULT_PROMPTS } from './defaultPrompts';
import * as db from './db';

// This action is a duplication of equivalent functionality in promptsCache.ts,
// but is separated as an action so that it can be easier used in client components.
// (promptsCache cannot be used in client components because it uses server-only imports)
// Cache the function to avoid unnecessary database calls
export const getPromptInstructions = cache(
  async (typeId: string): Promise<string> => {
    try {
      const prompt = await db.getActivePromptByType(typeId);
      // If the prompt exists in the database, return it
      if (prompt) {
        console.log(
          `[i] Prompt instructions for type ${typeId}:`,
          prompt.instructions
        );
        return prompt.instructions;
      }
    } catch (error) {
      console.error('Error fetching prompt:', error);
    }

    console.log(
      `[WARNING] No active prompt found for type ${typeId}, using default fallback`
    );

    // If not in the database, check if it's in the default prompts
    // Check if we have a default for this type
    const defaultPrompt =
      DEFAULT_PROMPTS[typeId as keyof typeof DEFAULT_PROMPTS];
    if (defaultPrompt) {
      return defaultPrompt;
    }

    console.log(`[ERROR] No default prompt available for type ${typeId}`);
    return '';
  }
);
