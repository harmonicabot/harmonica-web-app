import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import ParticipantSessionRow from './ParticipantSessionRow';
import SortableTable, { TableHeaderData } from '../SortableTable';
import { UserSession, HostSession } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import GenerateResponsesModal from './GenerateResponsesModal';
import ImportResponsesModal from './ImportResponsesModal';
import { Download, Sparkles } from 'lucide-react';
import ExportSection from '../Export/ExportSection';
import { useSubscription } from '@/hooks/useSubscription';
import { LockIcon } from 'lucide-react';
import { PricingModal } from '../pricing/PricingModal';

// Constants
const FREE_TIER_PARTICIPANT_LIMIT = 10;

export type ParticipantsTableData = {
  userName: string;
  sessionStatus: string;
  createdDate: Date;
  updatedDate: Date;
  includeInSummary: boolean;
  userData: UserSession;
  canViewTranscript: boolean;
  isLimited: boolean;
};

export default function SessionParticipantsTable({
  sessionId,
  userData,
  hostData,
  onIncludeInSummaryChange,
}: {
  sessionId: string;
  userData: UserSession[];
  hostData: HostSession;
  onIncludeInSummaryChange: (userId: string, included: boolean) => void;
}) {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const { status: subscriptionTier } = useSubscription();
  const isFreeUser = subscriptionTier === 'FREE';

  const dateSorter = (sortDirection: string, a: string, b: string) => {
    return sortDirection === 'asc'
      ? new Date(a).getTime() - new Date(b).getTime()
      : new Date(b).getTime() - new Date(a).getTime();
  };
  
  const tableHeaders: TableHeaderData[] = [
    { label: 'Name', sortKey: 'userName', className: '' },
    {
      label: 'Status',
      sortKey: 'sessionStatus',
      className: 'hidden md:table-cell',
    },
    {
      label: 'Created',
      sortKey: 'createdDate',
      sortBy: dateSorter,
      className: 'hidden md:table-cell',
    },
    { label: 'Updated', sortKey: 'updatedDate', sortBy: dateSorter },
    {
      label: 'Include in summary',
      sortKey: 'includeInSummary',
      sortBy: (dir, a: boolean, b: boolean) => {
        return dir === 'asc' ? Number(b) - Number(a) : Number(a) - Number(b);
      },
      className: 'hidden md:table-cell',
    },
  ];

  // Sort users by last edit time (most recent first)
  const sortedUserData = [...userData].sort(
    (a, b) => new Date(b.last_edit).getTime() - new Date(a.last_edit).getTime()
  );

  // Add this useEffect to handle the limit enforcement
  useEffect(() => {
    if (isFreeUser) {
      // Check for users beyond the limit who are currently included in summary
      const usersToExclude = sortedUserData
        .slice(FREE_TIER_PARTICIPANT_LIMIT)
        .filter(data => data.include_in_summary)
        .map(data => data.id);
      
      // Update each user that needs to be excluded
      usersToExclude.forEach(userId => {
        console.log("Hitting limit for user ID:", userId);
        onIncludeInSummaryChange(userId, false);
      });
    }
  }, [sortedUserData, isFreeUser, onIncludeInSummaryChange]);

  // Process user data with limits for free tier (without state updates)
  const processedUserData = sortedUserData.map((data, index) => {
    const isWithinLimit = !isFreeUser || index < FREE_TIER_PARTICIPANT_LIMIT;
    
    return {
      userName: data.user_name ?? 'anonymous',
      sessionStatus: data.active ? 'Started' : 'Finished',
      createdDate: new Date(data.start_time),
      updatedDate: new Date(data.last_edit),
      includeInSummary: isWithinLimit ? data.include_in_summary : false,
      userData: data,
      canViewTranscript: isWithinLimit,
      isLimited: !isWithinLimit && isFreeUser,
    };
  });

  const getTableRow = (sortableData: ParticipantsTableData, index: number) => {
    if (sortableData.isLimited && index === FREE_TIER_PARTICIPANT_LIMIT) {
      return (
        <>

          <tr className="bg-amber-50 border-t border-b border-amber-200">
            <td colSpan={6} className="py-4 px-4 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2 text-amber-800">
                  <LockIcon size={16} />
                  <span className="font-medium">
                    Free accounts are limited to {FREE_TIER_PARTICIPANT_LIMIT} participants in summary
                  </span>
                </div>
                <Button variant="default" className="mt-1" onClick={() => setShowPricingModal(true)}>
                  Upgrade to Pro
                </Button>
              </div>
            </td>
          </tr>
          <ParticipantSessionRow
            key={index}
            tableData={sortableData}
            onIncludeChange={onIncludeInSummaryChange}
          />
        </>
      );
    }
    
    return (
      <ParticipantSessionRow
        key={index}
        tableData={sortableData}
        onIncludeChange={onIncludeInSummaryChange}
      />
    );
  };

  return (
    <>
      {showPricingModal &&
        <PricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
        />
      }
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Participants</CardTitle>
            <CardDescription>
              View participants progress and transcripts
              {isFreeUser && userData.length > FREE_TIER_PARTICIPANT_LIMIT && (
                <span className="ml-1 text-amber-600">
                  (Limited to {FREE_TIER_PARTICIPANT_LIMIT} participants in free tier)
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {userData.length > 0 && (
                          <Button
              variant="ghost"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <Sparkles className="w-4 h-4" />
              Generate Responses
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {userData.length === 0 ? (
            <div className="text-center text-gray-500">
              No participants have joined this session yet
            </div>
          ) : (
            <SortableTable
              tableHeaders={tableHeaders}
              getTableRow={getTableRow}
              data={processedUserData}
              defaultSort={{ column: 'updatedDate', direction: 'desc' }}
            />
          )}
        </CardContent>
        <GenerateResponsesModal
          isOpen={isGenerateModalOpen}
          onOpenChange={setIsGenerateModalOpen}
          sessionId={sessionId}
        />
        <ImportResponsesModal
          isOpen={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          sessionId={sessionId}
        />
      </Card>
      
      {/* Export Modal */}
      <ExportSection
        hostData={hostData}
        userData={userData}
        id={sessionId}
        className="hidden"
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
      />
    </>
  );
}
