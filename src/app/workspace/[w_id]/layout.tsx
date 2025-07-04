import { Analytics } from '@vercel/analytics/react';
import Providers from 'app/(dashboard)/providers';

export default function WorkspaceLayout({
  children,
}: {
    children: React.ReactNode;
  }) {

  return (
    <Providers>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <div className="flex flex-col sm:gap-10 sm:py-4 sm:px-14 pb-16">
          <div className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4">
            {children}
          </div>
        </div>
      </div>
      <Analytics />
    </Providers>
  );
}