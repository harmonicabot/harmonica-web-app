import { initLogger, Logger } from 'braintrust';

let logger: Logger<boolean> | null = null;

export function getBraintrustLogger(): Logger<boolean> | null {
  if (!logger) {
    const apiKey = process.env.BRAINTRUST_API_KEY;
    if (!apiKey) {
      console.warn(
        'BRAINTRUST_API_KEY is not defined. Braintrust logging will not be captured.',
      );
      return null;
    }
    logger = initLogger({
      projectName: 'harmonica',
      apiKey,
      asyncFlush: true,
    });
  }
  return logger;
}

/**
 * Wraps a function with a Braintrust parent span for hierarchical tracing.
 * If Braintrust is not configured, executes the function directly.
 */
export async function traceOperation<T>(
  name: string,
  metadata: Record<string, unknown>,
  fn: (spanOpts: { operation: string }) => Promise<T>,
): Promise<T> {
  const bt = getBraintrustLogger();
  if (!bt) {
    return fn({ operation: name });
  }

  return bt.traced(
    async (span) => {
      try {
        const result = await fn({ operation: name });
        span.log({ metadata: { ...metadata, operation: name } });
        return result;
      } catch (error) {
        span.log({
          metadata: { ...metadata, operation: name },
          scores: { error: 1 },
        });
        throw error;
      }
    },
    { name },
  );
}
