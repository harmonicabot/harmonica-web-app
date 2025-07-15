"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbChevronSeparator,
} from '@/components/ui/breadcrumb';
import { Analytics } from '@vercel/analytics/react';
import User from '../../components/user';
import Providers from './providers';
import { SearchInput } from './search';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardRoot = pathname === '/dashboard' || pathname === '/';
  return (
    <Providers>
      <div className="flex min-h-screen w-full flex-col">
        <div className="flex flex-col sm:gap-10 sm:pt-4 sm:px-14 pb-16">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            {!isDashboardRoot && <DashboardBreadcrumb />}
            {/* <SearchInput /> */}
          </header>
          <div className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4">
            {children}
          </div>
        </div>
        <Analytics />
      </div>
    </Providers>
  );
}

function DashboardBreadcrumb() {
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {/* <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="#">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator /> */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="#">Sessions</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbChevronSeparator />
        {/* <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>All Sessions</BreadcrumbPage>
        </BreadcrumbItem> */}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
