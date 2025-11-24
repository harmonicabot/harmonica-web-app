'use client';

import Logo from '@/components/ui/logo';
import User from '@/components/user';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Navigation() {

  return (
    <nav className="p-4">
      <div className="flex flex-row justify-between items-center px-2">
        <Link href="/">
          <div className="hidden md:block">
            <Logo />
          </div>
          <div className="block md:hidden">
            <img src="/harmonica.png" alt="Harmonica" className="h-8 w-8" />
          </div>
        </Link>
        <div className="flex items-center space-x-4">
          <Link
            href="https://opencollective.com/harmonica/donate?interval=oneTime&amount=20&contributeAs=me"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Donate
            </Button>
          </Link>
          <Link
            href="https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Help
            </Button>
          </Link>
          <User />
        </div>
      </div>
    </nav>
  );
}
