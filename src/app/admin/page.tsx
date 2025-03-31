'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/admin/prompts');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-100px)]">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
    </div>
  );
}
