import { OpenAI as LlamaOpenAI, ChatMessage } from 'llamaindex';
import { Gemini, GEMINI_MODEL } from '@llamaindex/google';
import { Anthropic } from '@llamaindex/anthropic';

type Provider = 'openai' | 'anthropic' | 'gemini' | 'publicai' | 'swiss-ai' | 'aisingapore' | 'BSC-LT';
type LLMInstance = LlamaOpenAI | Anthropic | Gemini;

const getApiKey = (provider: Provider): string => {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'gemini':
      return process.env.GOOGLE_API_KEY || '';
    case 'publicai':
    case 'swiss-ai':
    case 'aisingapore': 
    case 'BSC-LT':
      return process.env.PUBLIC_AI_API_KEY || '';
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

const getGeminiModel = (modelName: string) => {
  const model = GEMINI_MODEL[modelName as keyof typeof GEMINI_MODEL];
  if (!model) {
    throw new Error(
      `Invalid Gemini model: ${modelName}. Must be one of: ${Object.values(GEMINI_MODEL).join(', ')}`,
    );
  }
  return model;
};

interface ChatInterface {
  chat(params: { messages: ChatMessage[] }): Promise<any>;
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

  async chat(params: { messages: ChatMessage[]; distinctId?: string }): Promise<string> {
    const startTime = Date.now();
    // All LLMs actually accept the same message format, even though they specify it differently.
    // In TS we have to have the ChatInterface to prevent type errors.
    let responseString = '';
    try {
      const response = await this.llm.chat(params);

      console.log(
        '[i] Chat response content:',
        JSON.stringify(response.message.content),
      );
      // Normalize response format based on provider type
      if (response.message.content instanceof Array) {
        responseString = response.message.content.map((c: any) => c.text).join('');
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
                inputTokens = raw.usage.prompt_tokens || raw.usage.input_tokens || 0;
                outputTokens = raw.usage.completion_tokens || raw.usage.output_tokens || 0;
            }
            // 2. Anthropic style
            // Structure: { usage: { input_tokens: 10, output_tokens: 20 } }
            // Note: LlamaIndex might map this to the standard 'usage' object above, but checking raw keys safely
            else if (raw.input_tokens !== undefined && raw.output_tokens !== undefined) {
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
        if (this.model === 'GEMINI_2_0_FLASH_THINKING_EXP') {
            reportedModel = 'google/gemini-2.0-flash-thinking-exp:free'; // Or just 'google/gemini-2.0-flash-thinking-exp' when it becomes paid
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
                        content: responseString
                    }
                }
            ],
            $ai_latency: (endTime - startTime) / 1000,
            $ai_input_tokens: inputTokens,
            $ai_output_tokens: outputTokens,
            $ai_status: 'success',
            $ai_trace_id: crypto.randomUUID(),
          },
        });
      }
    } catch (error) {
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
  temperature = 0.7,
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
      llm = new LlamaOpenAI({
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
      console.log(`Preparing PublicAI model ${provider}/${model}`)
      llm = new LlamaOpenAI({
        model: `${provider}/${model}`,
        apiKey,
        temperature,
        baseURL: 'https://api.publicai.co/v1',
        additionalSessionOptions: {
          defaultHeaders: {
            'User-Agent': "Harmonica/1.0",
          }
        },
      });
      break;
    default:
      throw new Error(`Provider ${provider} not implemented`);
  }

  return new LLM(llm, model, provider);
};
