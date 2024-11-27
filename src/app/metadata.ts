import type { Metadata, ResolvingMetadata } from "next";

export const metadata: Metadata = {
  title: {
    template: '%s | Harmonica',
    default: 'Harmonica - Superfast sensemaking',
  },
};

export async function generateMetadata(fetchingFunction: () => Promise<{}>): Promise<Metadata> { 
  const result = await fetchingFunction();
  return result
}