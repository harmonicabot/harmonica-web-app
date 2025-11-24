'use client';
import PostHogPageView from './PostHogPageView';
import { usePathname } from 'next/navigation';
import Navigation from './navigation';
import DonationToast from '@/components/donations/DonationToast';
// import SmallDonateBanner from '@/components/SmallDonateBanner';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatPage = pathname?.startsWith('/chat');
  const isWorkSpacePage = pathname?.startsWith('/workspace');
  const isAdminPage = pathname?.startsWith('/admin');
  const isRootPage = pathname === '/';

  return (
    <div>
      {/* {!isRootPage && !isChatPage && !isWorkSpacePage && (
        <SmallDonateBanner/>
      )} */}

      {isChatPage ? (
        <div>{children}</div>
      ) : (
        <div className="flex flex-col min-h-screen">
          {!isAdminPage && <Navigation />}
          <main className="flex flex-col justify-start flex-grow bg-background">
            {children}
          </main>
        </div>
      )}
      <PostHogPageView />
      <DonationToast />
    </div>
  );
}
