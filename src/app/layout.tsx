import '../styles/global.css';
import '../styles/amplify-auth-overrides.css'
import Link from 'next/link';
import Logo from '@/components/ui/logo';
import type { WithAuthenticatorProps } from '@aws-amplify/ui-react';
import AuthLink from '@/components/authLink';

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) { 
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <header className="bg-[#ffd88f]">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/">
                  <Logo className="logo" />
                </Link>
              </div>
              <div className="md:hidden">
                <div className="relative">
                  <button className="hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden hover:block">
                    <Link
                      href="/pricing"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Pricing
                    </Link>
                    <Link
                      href="/about"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      About
                    </Link>
                    <AuthLink/>
                  </div>
                </div>
              </div>
              <div className="">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link
                    href="/pricing"
                    className="hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/about"
                    className="hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    About
                  </Link>
                  <AuthLink/>
                </div>
              </div>
            </div>
          </nav>
        </header>
        <main className="flex flex-col justify-center flex-grow">
          {children}
        </main>
        <footer className="fixed bottom-0 left-0 right-0">
          <div>Powered by ourselves</div>
          {/* <div>{user.username}</div> */}
        </footer>
      </body>
    </html>
  );
}
