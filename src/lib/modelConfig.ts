import { ChatMessage } from 'llamaindex';
import { Gemini, GEMINI_MODEL } from '@llamaindex/google';
import { Anthropic } from '@llamaindex/anthropic';
import { OpenAI } from '@llamaindex/openai'
import { GoogleGenAI } from '@google/genai';

type Provider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'google'
  | 'publicai'
  | 'swiss-ai'
  | 'aisingapore'
  | 'BSC-LT';
type LLMInstance = OpenAI | Anthropic | Gemini;

const getApiKey = (provider: Provider): string => {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'gemini':
    case 'google':
      return process.env.GOOGLE_API_KEY || '';
    case 'publicai':
    case 'swiss-ai':
    case 'aisingapore':
    case 'BSC-LT':
      return process.env.PUBLICAI_API_KEY || '';
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

const getGeminiModel = (modelName: string) => {
  const model = GEMINI_MODEL[modelName as keyof typeof GEMINI_MODEL];
  if (!model) {
    throw new Error(
      `Invalid Gemini model: ${modelName}. Must be one of: ${Object.values(GEMINI_MODEL).join(', ')}.\n\nPossibly this list is outdated, in which case you may need to update @llamaindex/gemini`,
    );
  }
  console.log(`[i] Using Gemini model: ${model}`);
  return model;
};

interface ChatInterface {
  chat(params: { messages: ChatMessage[] }): Promise<any>;
}

/**
 * Lists available Gemini models using the Google GenAI SDK
 * @returns Promise<string[]> Array of available model names
 */
async function listAvailableGeminiModels(): Promise<string[]> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn('No GOOGLE_API_KEY found for listing models');
      return [];
    }

    const genAI = new GoogleGenAI({ apiKey });
    const models = await genAI.models.list();
    const modelNames: string[] = [];

    for await (const model of models) {
      if (model.name) {
        modelNames.push(model.name);
      }
    }

    console.log('Available Gemini models:', modelNames);
    return modelNames;
  } catch (error) {
    console.error('Error listing Gemini models:', error);
    return [];
  }
}

import { getPostHogClient } from './posthog-server';

// A wrapper class that normalizes the chat interface
// (each LLM's chat & response is unfortunately slightly different,
//  so creating a class that ensures they're handled properly and return a consistent response)
export class LLM {
  private llm: LLMInstance & ChatInterface;
  private model: string;
  private provider: string;

  constructor(llm: LLMInstance, model: string, provider: string) {
    this.llm = llm as LLMInstance & ChatInterface;
    this.model = model;
    this.provider = provider;
  }

  async chat(params: { messages: ChatMessage[]; distinctId?: string; tag?: string }): Promise<string> {
    const startTime = Date.now();
    // All LLMs actually accept the same message format, even though they specify it differently.
    // In TS we have to have the ChatInterface to prevent type errors.
    let responseString = '';
    try {
      console.log(
        `[i] Sending chat request to LLM:\n${JSON.stringify(this.llm.metadata, null, 2)}
        with params:\n\n`,
        JSON.stringify(params, null, 2)
      );
      const response = await this.llm.chat(params);

      console.log(
        '[i] Chat response content:',
        JSON.stringify(response.message.content)
      );
      // Normalize response format based on provider type
      if (response.message.content instanceof Array) {
        responseString = response.message.content
          .map((c: any) => c.text)
          .join('');
      } else {
        responseString = response.message.content.toString();
      }

      const endTime = Date.now();
      const client = getPostHogClient();
      if (client) {
        // Extract usage stats if available (structure varies by provider/library version)
        const rawResponse = response.raw;
        let inputTokens = 0;
        let outputTokens = 0;

        // Attempt to parse common usage formats
        if (rawResponse && typeof rawResponse === 'object') {
          const raw = rawResponse as any;

          // 1. OpenAI style (often used by LlamaIndex OpenAI provider)
          // Structure: { usage: { prompt_tokens: 10, completion_tokens: 20, ... } }
          if (raw.usage) {
            inputTokens =
              raw.usage.prompt_tokens || raw.usage.input_tokens || 0;
            outputTokens =
              raw.usage.completion_tokens || raw.usage.output_tokens || 0;
          }
          // 2. Anthropic style
          // Structure: { usage: { input_tokens: 10, output_tokens: 20 } }
          // Note: LlamaIndex might map this to the standard 'usage' object above, but checking raw keys safely
          else if (
            raw.input_tokens !== undefined &&
            raw.output_tokens !== undefined
          ) {
            inputTokens = raw.input_tokens;
            outputTokens = raw.output_tokens;
          }
          // 3. Google Gemini style
          // Structure: { usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 } }
          else if (raw.usageMetadata) {
            inputTokens = raw.usageMetadata.promptTokenCount || 0;
            outputTokens = raw.usageMetadata.candidatesTokenCount || 0;
          }
        }

        // Map specific internal model names to OpenRouter standard names for PostHog cost calculation
        // https://openrouter.ai/models
        let reportedModel = this.model;
        if (this.model.includes('2_0_FLASH')) {
          reportedModel = 'google/gemini-2.0-flash-exp';
        }

        client.capture({
          distinctId: params.distinctId || 'anonymous_server_user',
          event: '$ai_generation',
          properties: {
            $ai_model: reportedModel,
            $ai_provider: this.provider,
            $ai_input: params.messages,
            $ai_output_choices: [
              {
                message: {
                  role: 'assistant',
                  content: responseString,
                },
              },
            ],
            $ai_latency: (endTime - startTime) / 1000,
            $ai_input_tokens: inputTokens,
            $ai_output_tokens: outputTokens,
            $ai_status: 'success',
            $ai_trace_id: crypto.randomUUID(),
            tag: params.tag,
          },
        });
      }
    } catch (error) {
      console.error('Error in LLM chat:', error);
      const isError = (err: unknown): err is Error => {
        return err instanceof Error;
      };

      // Handle specific Gemini model availability issues
      if (isError(error) && error.message.includes('ListModels')) {
        console.warn(
          'Model may not be available. Attempting to list available models...'
        );

        // List available models to help diagnose the issue
        const availableModels = await listAvailableGeminiModels();

        if (availableModels.length > 0) {
          console.error(
            `Please update the model to use one of the following:\nAvailable Gemini models:`,
            availableModels
          );
        } else {
          console.error(
            'No available Gemini models found. Please check your API key and permissions.'
          );
        }
        const userFacingError = new Error(
          `Apologies, the backend API provider has changed their models.\nPlease contact support with this error message and where it occurred.`
        );
        throw userFacingError;
      }

      const endTime = Date.now();
      const client = getPostHogClient();
      if (client) {
        client.capture({
          distinctId: params.distinctId || 'anonymous_server_user',
          event: '$ai_generation',
          properties: {
            $ai_model: this.model,
            $ai_provider: this.provider,
            $ai_input: params.messages,
            $ai_latency: (endTime - startTime) / 1000,
            $ai_status: 'error',
            $ai_error: error instanceof Error ? error.message : String(error),
            $ai_trace_id: crypto.randomUUID(),
            tag: params.tag,
          },
        });
      }
      throw error;
    }
    return responseString;
  }
}

export const getLLM = (
  type: 'SMALL' | 'MAIN' | 'LARGE',
  temperature = 0.7
): LLM => {
  const model = process.env[`${type}_LLM_MODEL`];
  const provider = process.env[`${type}_LLM_PROVIDER`] as Provider;

  if (!model || !provider) {
    throw new Error(`Missing configuration for ${type}_LLM`);
  }

  const apiKey = getApiKey(provider);
  let llm: LLMInstance;

  switch (provider) {
    case 'openai':
      llm = new OpenAI({
        model,
        apiKey,
        temperature,
      });
      break;
    case 'anthropic':
      llm = new Anthropic({
        model,
        apiKey,
        temperature,
      });
      break;
    case 'gemini':
      llm = new Gemini({
        model: getGeminiModel(model),
        temperature,
      });
      break;
    case 'publicai':
    case 'swiss-ai':
    case 'aisingapore':
    case 'BSC-LT':
      console.log(`Preparing PublicAI model ${provider}/${model}`);
      llm = new OpenAI({
        model: `${provider}/${model}`,
        apiKey,
        temperature,
        baseURL: 'https://api.publicai.co/v1',
        additionalSessionOptions: {
          defaultHeaders: {
            'User-Agent': 'Harmonica/1.0',
          },
        },
      });
      break;
    default:
      throw new Error(`Provider ${provider} not implemented`);
  }

  return new LLM(llm, model, provider);
};
