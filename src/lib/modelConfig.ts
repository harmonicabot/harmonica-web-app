import { OpenAI as LlamaOpenAI, Gemini, GEMINI_MODEL } from 'llamaindex';

type Provider = 'openai' | 'anthropic' | 'gemini';
type LLMInstance = LlamaOpenAI | Gemini;

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

export const getLLM = (
  type: 'SMALL' | 'MAIN' | 'LARGE',
  temperature = 0.7,
): LLMInstance => {
  const model = process.env[`${type}_LLM_MODEL`];
  const provider = process.env[`${type}_LLM_PROVIDER`] as Provider;

  if (!model || !provider) {
    throw new Error(`Missing configuration for ${type}_LLM`);
  }

  const apiKey = getApiKey(provider);

  switch (provider) {
    case 'openai':
      return new LlamaOpenAI({
        model,
        apiKey,
        maxTokens: 150,
        temperature,
      });
    case 'gemini':
      return new Gemini({
        model: getGeminiModel(model),
        temperature,
      });
    default:
      throw new Error(`Provider ${provider} not implemented`);
  }
};
