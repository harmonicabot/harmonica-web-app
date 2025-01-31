'use client'

import Logo from '@/components/ui/logo';
import User from '@/components/user';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ENSNavigation from './workspace/[id]/ENSNavigation';

export default function Navigation() {

  const pathname = usePathname()
  const isENS = pathname.startsWith('/ens');

  return <nav className="p-4">
    <div className="flex flex-row justify-between items-center px-2">
      <Link href="/">
        <Logo />
      </Link>
      {isENS && (<ENSNavigation/>)}
      <div className="flex items-center space-x-4">
        <Link
          href="https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Help
          </button>
        </Link>
        <User />
      </div>
    </div>
  </nav>;
}
