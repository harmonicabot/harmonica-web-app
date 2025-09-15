'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavItem({
  href,
  label,
  children
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant={pathname === href ? 'secondary' : 'ghost'}
          size="icon"
          className="h-9 w-9 md:h-8 md:w-8"
        >
          <Link
            href={href}
            className="flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            {children}
            <span className="sr-only">{label}</span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
