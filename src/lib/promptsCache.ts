import 'server-only';
import * as db from './db';
import { cache } from 'react';
import { DEFAULT_PROMPTS } from './defaultPrompts';

export type Prompt = {
  id: string;
  prompt_type: string;
  instructions: string;
  active: boolean;
  type_name?: string;
};

// Cached function to get all prompts
export const getAllPrompts = cache(db.getAllPrompts);  

// Cached function to get active prompt by type with default fallback
export const getActivePromptByType = cache(db.getActivePromptByType);

// Helper function that returns the instructions or a default
export const getPromptInstructions = cache(
  async (typeId: string): Promise<string> => {
    const prompt = await getActivePromptByType(typeId);

    // Add more detailed logging to help diagnose the issue
    if (!prompt) {
      console.log(
        `[WARNING] No active prompt found for type ${typeId}, using default fallback`,
      );
    }

    // Check if we have a default for this type
    const defaultPrompt =
      DEFAULT_PROMPTS[typeId as keyof typeof DEFAULT_PROMPTS];
    if (!defaultPrompt) {
      console.log(`[ERROR] No default prompt available for type ${typeId}`);
    }

    console.log(`[INFO] Using prompt: ${prompt?.instructions || defaultPrompt} for type ${typeId}`);
    return prompt?.instructions || defaultPrompt || '';
  },
);
