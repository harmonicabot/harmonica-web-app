'use client';
import PostHogPageView from './PostHogPageView';
import { usePathname } from 'next/navigation';
import Navigation from './navigation';
// import { Button } from '@/components/ui/button';
// import Link from 'next/link';
// import { X } from 'lucide-react';
// import { useState } from 'react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatPage = pathname?.startsWith('/chat');
  // const isWorkSpacePage = pathname?.startsWith('/workspace');
  // const isRootPage = pathname === '/';
  // const [showBanner, setShowBanner] = useState(true);

  return (
    <div>
      {/* {showBanner && !isRootPage && !isChatPage && !isWorkSpacePage && (
        <div className="w-full bg-amber-50 border-b border-amber-100">
          <div className="container mx-auto py-4 px-4 flex items-center justify-center relative">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-black">
                Support Harmonica before 14th Feb
              </p>
              <Link
                href="https://giveth.io/project/harmonica-ai-agent-for-multiplayer-sensemaking"
                target="_blank"
                className="text-sm font-bold text-black hover:underline"
              >
                Donate
              </Link>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-4 p-1 hover:bg-amber-100/50 rounded-full"
              aria-label="Close banner"
            >
              <X className="h-4 w-4 text-black" />
            </button>
          </div>
        </div>
      )} */}

      {isChatPage ? (
        <div>{children}</div>
      ) : (
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <main className="flex flex-col justify-start flex-grow bg-purple-50">
            {children}
          </main>
        </div>
      )}
      <PostHogPageView />
    </div>
  );
}
