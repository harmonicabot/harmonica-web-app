import { OpenAI as LlamaOpenAI, ChatMessage } from 'llamaindex';
import { Gemini, GEMINI_MODEL } from '@llamaindex/google';
import { Anthropic } from '@llamaindex/anthropic';

type Provider = 'openai' | 'anthropic' | 'gemini';
type LLMInstance = LlamaOpenAI | Anthropic | Gemini;

const getApiKey = (provider: Provider): string => {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'gemini':
      return process.env.GOOGLE_API_KEY || '';
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

// A wrapper class that normalizes the chat interface
// (each LLM's chat & response is unfortunately slightly different,
//  so creating a class that ensures they're handled properly and return a consistent response)
export class LLM {
  private llm: LLMInstance & ChatInterface;

  constructor(llm: LLMInstance) {
    this.llm = llm as LLMInstance & ChatInterface;
  }

  async chat(params: { messages: ChatMessage[] }): Promise<string> {
    // All LLMs actually accept the same message format, even though they specify it differently.
    // In TS we have to have the ChatInterface to prevent type errors.
    const response = await this.llm.chat(params);

    console.log(
      '[i] Chat response content:',
      JSON.stringify(response.message.content),
    );
    // Normalize response format based on provider type
    if (response.message.content instanceof Array) {
      return response.message.content.map((c: any) => c.text).join('');
    } else {
      return response.message.content.toString();
    }
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
    default:
      throw new Error(`Provider ${provider} not implemented`);
  }

  return new LLM(llm);
};
