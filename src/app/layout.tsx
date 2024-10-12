import Link from 'next/link';
import '../styles/global.css';
// import { UserProvider } from '../context/UserContext';
// import Auth from '@/components/Auth';
import Logo from '@/components/ui/logo';
import { User } from '@/components/user';
import { Instrument_Sans } from 'next/font/google';
import NextAuthSessionProvider from '@/components/SessionProvider';

const instrumentSans = Instrument_Sans({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={instrumentSans.className}>
      <body className="flex flex-col min-h-screen">
        <nav className="p-4">
          <div className="flex flex-row justify-between items-center px-2">
            <Link href="/">
              <Logo />
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  Help
                </button>
              </Link>
              <User />
            </div>
          </div>
        </nav>
        <main className="flex flex-col justify-center flex-grow bg-purple-50">
          <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
        </main>
      </body>
    </html>
  );
}
