import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';

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
  ],
};


export default withMiddlewareAuthRequired(async (req, event) => {
  const userAgent = req.headers.get('user-agent') || '';
  
  const isBot = BOTS.some(bot => {
    const botPattern = new RegExp(bot, 'i'); // Case-insensitive
    return botPattern.test(userAgent);
  });

  if (isBot) {
    // Allow bots without authentication
    return NextResponse.next();
  }
});