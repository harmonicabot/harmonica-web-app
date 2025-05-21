'use client';

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

export function ClientBreadcrumb() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    switch (pathname) {
      case '/':
        return (
          <>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        );

      case '/billing':
        return (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbChevronSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Billing</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        );

      case '/settings':
        return (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbChevronSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>{getBreadcrumbs()}</BreadcrumbList>
    </Breadcrumb>
  );
}
