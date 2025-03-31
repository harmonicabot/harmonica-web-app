'use client';

import { Settings, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-4">
            <Construction className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Settings Coming Soon</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            We're working on adding configuration options to help you customize
            your experience.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" disabled>
              <Settings className="mr-2 h-4 w-4" />
              Explore Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
