'use client';
import PostHogPageView from './PostHogPageView';
import { usePathname } from 'next/navigation';
import Navigation from './navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatPage = pathname?.startsWith('/test-chat');

  return (
    <div>
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
