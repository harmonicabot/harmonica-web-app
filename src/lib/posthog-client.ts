import posthog from 'posthog-js';

/**
 * Capture a product event from client components with common properties auto-injected.
 */
export function captureClientEvent(
  event: string,
  properties: Record<string, unknown> = {}
) {
  posthog.capture(event, {
    ...properties,
    app_version: 'oss',
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',
  });
}
