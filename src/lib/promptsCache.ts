import 'server-only';
import { cache } from 'react';
import { sql } from '@vercel/postgres';
import { DEFAULT_PROMPTS } from './defaultPrompts';

export type Prompt = {
  id: string;
  prompt_type: string;
  instructions: string;
  active: boolean;
  type_name?: string;
};

// Cached function to get all prompts
export const getAllPrompts = cache(async (): Promise<Prompt[]> => {
  const { rows } = await sql`
    SELECT 
      p.id,
      p.prompt_type,
      p.instructions,
      p.active,
      pt.name as type_name
    FROM prompts p
    JOIN prompt_type pt ON p.prompt_type = pt.id
    ORDER BY p.created_at DESC
  `;

  return rows as Prompt[];
});

// Cached function to get active prompt by type with default fallback
export const getActivePromptByType = cache(
  async (typeId: string): Promise<Prompt | null> => {
    // First, try to find by direct ID match
    const { rows } = await sql`
    SELECT 
      p.id,
      p.prompt_type,
      p.instructions,
      p.active,
      pt.name as type_name
    FROM prompts p
    JOIN prompt_type pt ON p.prompt_type = pt.id
    WHERE (p.prompt_type = ${typeId} OR pt.name = ${typeId})
    AND p.active = true
    LIMIT 1
  `;

    console.log(
      `[i] Retrieved prompt for type ${typeId}:`,
      rows[0] || 'Not found',
    );
    return (rows[0] as Prompt) || null;
  },
);

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

    return prompt?.instructions || defaultPrompt || '';
  },
);
