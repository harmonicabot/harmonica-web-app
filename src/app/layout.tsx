import Link from 'next/link';
import '../styles/global.css';
// import { UserProvider } from '../context/UserContext';
// import Auth from '@/components/Auth';
import Logo from '@/components/ui/logo';
import UserStatus from '@/components/ui/UserStatus';
import NextAuthSessionProvider from "@/components/SessionProvider"

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  
  return (
    <html lang="en">
        <body className="flex flex-col min-h-screen">         
        <NextAuthSessionProvider>
          {/* <Auth> */}
          <nav className="flex flex-row justify-between items-center p-4">
            <Link href="/">
              <Logo />
            </Link>
            <UserStatus />
          </nav>
          <main className="flex flex-col justify-center flex-grow">
            {children}
            </main>
            {/* </Auth> */}
      </NextAuthSessionProvider>
        </body>
    </html>
  );
}