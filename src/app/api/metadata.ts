import { decryptId } from '@/lib/encryptionUtils';
import { Metadata } from 'next';
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
  title: 'Harmonica - AI sensemaking',
  description: `Create AI-facilitated conversations to gather insights from your team, users, or community. Design custom sessions and transform collective input into actionable strategies.`,
};

const defaultOpenGraph = {
  title: defaultMetadata.title,
  description: defaultMetadata.description || '',
  images: [
    {
      url: './og_app.png',
      width: 1200,
      height: 675,
      alt: 'Harmonica - The AI-powered virtual facilitator'
    }
  ],
};

export const routeMetadata: MetadataConfig = {
  '/': getWithTitleAndDescription('Dashboard'),
  '/create': getWithTitleAndDescription(
    'Create',
    'Manage your Harmonica conversations and settings'
  ),
  '/login': getWithTitleAndDescription('Sign in to Harmonica'),
};

function getWithTitleAndDescription(
  customTitle: string | {absolute: string},
  description?: string
): Metadata {
  let title = customTitle;
  if (typeof customTitle === 'string') {
    title = `${customTitle} | Harmonica`
  }
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
  // Handle dynamic session & chat routes
  let sessionId;
  if (path.startsWith('/sessions/')) {
    const rawSessionId = path.split('/')[2];
    sessionId = decryptId(rawSessionId);
    const hostData = await db.getHostSessionById(sessionId);
    return getWithTitleAndDescription(hostData.topic)
  }
  else if (path.startsWith('/chat?s=')) {
    sessionId = path.split('?s=')[1];
    const hostData = await db.getHostSessionById(sessionId);
    const description = `Join an AI-facilitated conversation to share your thoughts and help shape collective decisions. Contribute meaningfully to your group's goals through guided dialogue.`;
    const absoluteTitle = `${hostData.topic}${hostData.topic.length < 15 ? ` | powered by Harmonica` : ''}`;
    return {
      ...defaultMetadata,
      title: {
        absolute: absoluteTitle,
      },
      description: description,
      openGraph: {
        ...defaultOpenGraph,
        title: hostData.topic,
        description: description,
        images: [
          {
            url: './og_chat.png',
            width: 1200,
            height: 675,
            alt: 'You have been invited to share...',
          }
        ],
      },
    }
  }

  return routeMetadata[path] || routeMetadata['/'];
}
