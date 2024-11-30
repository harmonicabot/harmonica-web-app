import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

// These are added so that common bots can access metadata
const BOTS = [
  'googlebot',
  'bingbot',
  'slackbot',
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'embedly',
  'discordbot',
  'notionbot',
  'whatsapp',
  'discord',
  'notion',
  'discourse-forum',
  'telegrambot',
  'telegram-bot',
  'tg:social',
];

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|chat|h_chat_icon.png|opengraph-image.png).*)',
    {
      source: '/(.*)',
      has: [{
        type: 'header',
        key: 'user-agent',
        value: `(?i)(${BOTS.join('|')})`,
      }],
    },
  ],
};


export default withMiddlewareAuthRequired();