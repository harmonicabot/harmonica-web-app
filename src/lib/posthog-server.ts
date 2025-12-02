import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export const getPostHogClient = () => {
  if (!posthogClient) {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        flushAt: 1,
        flushInterval: 0
      });
    } else {
      console.warn('NEXT_PUBLIC_POSTHOG_KEY is not defined. PostHog analytics will not be captured.');
    }
  }
  return posthogClient;
};

