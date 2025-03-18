'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { PromptTypeList } from './PromptTypeList';
import { CreatePromptTypeDialog } from './CreatePromptTypeDialog';

export default function PromptTypesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time or wait for actual data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [refreshKey]);

  const handleSuccess = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Prompt Types
        </h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Prompt Type
        </Button>
      </div>

      <PromptTypeList key={refreshKey} />

      <CreatePromptTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
