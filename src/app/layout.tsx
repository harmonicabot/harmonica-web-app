import { Suspense } from 'react';
import { Providers } from './providers';
import '../styles/global.css';
import { Instrument_Sans } from 'next/font/google';
import ClientLayout from './clientLayout';

export const metadata = {
  title: {
    template: '%s | Harmonica',
    default: 'Harmonica sensemaking',
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
