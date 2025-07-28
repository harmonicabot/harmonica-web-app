'use client';

import React from 'react';
import ResultTabs from './ResultTabs';
import ExportSection from '../Export/ExportSection';
import { ResultTabsVisibilityConfig } from '@/lib/schema';
import { usePermissions } from '@/lib/permissions';
import ShareSettings from '../ShareSettings';

export default function SessionResultsSection({
  resourceId,
  visibilityConfig,
}: {
  resourceId: string;
  visibilityConfig: ResultTabsVisibilityConfig;
}) {
  const { loading, hasMinimumRole } = usePermissions(resourceId);
  const showExport = visibilityConfig.showChat; // Show chat will be false if there aren't any messages yet, 
                                                // in which case we also don't need to show the export button.

  return (
    <>
      {!loading && hasMinimumRole('editor') && (
        <div className="flex w-full justify-end mt-4 -mb-14">
          <ShareSettings 
            resourceId={resourceId} 
            resourceType="SESSION"
          />
        </div>
      )}
      <h3 className="text-2xl font-bold mb-4 mt-12">Results</h3>
          <ResultTabs
            resourceId={resourceId}
            visibilityConfig={visibilityConfig}
          />
          {visibilityConfig.showResponses && hasMinimumRole('editor') && showExport && (
            <ExportSection
              id={resourceId}
              className="mt-4"
            />
          )}
    </>
  );
}
