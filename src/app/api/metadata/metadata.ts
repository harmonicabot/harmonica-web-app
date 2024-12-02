import { decryptId } from '@/lib/encryptionUtils';
import { Metadata } from 'next';
import { NextRequest } from 'next/server';
import * as db from '@/lib/db';

type MetadataConfig = {
  [route: string]: Metadata;
};

const defaultMetadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'https://app.harmonica.chat'
  ),
  applicationName: 'Harmonica',
  keywords: [
    'Deliberation',
    'Sensemaking',
    'AI Facilitation',
    'Form',
    'Survey',
  ],
  title: 'Harmonica - Ultrafast sensemaking',
  description: `Create AI-facilitated conversations to gather insights from your team, users, or community. Design custom sessions and transform collective input into actionable strategies.`,
};

const defaultOpenGraph = {
  title: defaultMetadata.title,
  description: defaultMetadata.description || '',
  image: '/og_app.png',
};

export const routeMetadata: MetadataConfig = {
  '/': getWithTitleAndDescription('Dashboard | Harmonica'),
  '/create': getWithTitleAndDescription(
    'Create',
    'Manage your Harmonica conversations and settings'
  ),
  '/login': getWithTitleAndDescription('Sign in to Harmonica'),
};

function getWithTitleAndDescription(
  title: string,
  description?: string
): Metadata {
  return {
    ...defaultMetadata,
    title,
    description: description || `Perform superfast async AI deliberations`,
    openGraph: {
      ...defaultOpenGraph,
      title,
      description: description || `Perform superfast async AI deliberations`,
    },
  };
}

export async function getGeneratedMetadata(path: string) {
  let metadata = routeMetadata[path] || routeMetadata['/'];
  console.log(`Default Metadata for path ${path}: `, metadata);
  // Handle dynamic session & chat routes
  let sessionId;
  if (path.startsWith('/sessions/')) {
    const rawSessionId = path.split('/')[2];
    sessionId = decryptId(rawSessionId);
    const hostData = await db.getHostSessionById(sessionId);
    metadata.title = hostData.topic;
    metadata.openGraph!.title = hostData.topic;
  }
  else if (path.startsWith('/chat?')) {
    sessionId = path.split('?s=')[1];
    const hostData = await db.getHostSessionById(sessionId);
    const description = `Join an AI-facilitated conversation to share your thoughts and help shape collective decisions. Contribute meaningfully to your group's goals through guided dialogue.`;
    metadata = {
      ...defaultMetadata,
      title: {
        absolute: hostData.topic,
      },
      description: description,
      openGraph: {
        ...defaultOpenGraph,
        title: hostData.topic,
        description: description,
        images: {url: '/og_chat.png'}
      },
    }
  }

  return metadata;
}
