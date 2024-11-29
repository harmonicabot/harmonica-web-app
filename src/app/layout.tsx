import { Suspense } from 'react';
import { Providers } from './providers';
import '../styles/global.css';
import { Instrument_Sans } from 'next/font/google';
import ClientLayout from './clientLayout';

export const metadata = {
  applicationName: 'Harmonica',
  keywords:["Deliberation", "Sensemaking", "AI Facilitation", "Form", "Survey"],
  title: {
    template: '%s | Harmonica',
    default: 'Harmonica - AI sensemaking',
  },
  openGraph: {
    title: "Harmonica - Ultrafast sensemaking",
    description: 'Create AI-facilitated conversations to gather insights from your team, users, or community. Design custom sessions and transform collective input into actionable strategies.',
    siteName: 'harmonica.chat',
  },
};

const instrumentSans = Instrument_Sans({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSans.className}>
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          <Providers>
            <ClientLayout>{children}</ClientLayout>
          </Providers>
        </Suspense>
      </body>
    </html>
  );
}
