'use client';

import { cn } from '@/lib/clientUtils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes, // For types/categories
  FileText, // For instructions/prompts
  Settings,
} from 'lucide-react';

const navigation = [
  {
    name: 'Prompt Types',
    href: '/admin/prompt-types',
    icon: Boxes, // Changed to Boxes to represent different types/categories
  },
  {
    name: 'Prompts',
    href: '/admin/prompts',
    icon: FileText, // Changed to FileText to represent instructions/documents
  },
  // Future items can be added here
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
      </div>
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-2 text-sm rounded-md',
                isActive
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
