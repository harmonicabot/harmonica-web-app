import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { Analytics } from '@vercel/analytics/react';
import Providers from 'app/(dashboard)/providers';
import { Footer } from '../Footer';

export default function WorkspaceLayout({
  children,
  params
}: {
    children: React.ReactNode;
    params: { w_id: string }
  }) {
  const workspaceId = params.w_id;

  return (
    <Providers>
      <div className="flex min-h-screen w-full flex-col bg-purple-50">
        <div className="flex flex-col sm:gap-10 sm:pt-4 sm:px-14 pb-16">
          <div className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4">
            {children}
          </div>
        </div>
      </div>
      <Footer workspaceId={workspaceId}/>
      <Analytics />
    </Providers>
  );
}