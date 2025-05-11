import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import ParticipantSessionRow from './ParticipantSessionRow';
import SortableTable, { TableHeaderData } from '../SortableTable';
import { UserSession } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import GenerateResponsesModal from './GenerateResponsesModal';
import ImportResponsesModal from './ImportResponsesModal';
import SessionFilesTable from './SessionFilesTable';

export type ParticipantsTableData = {
  userName: string;
  sessionStatus: string;
  createdDate: Date;
  updatedDate: Date;
  includeInSummary: boolean;
  userData: UserSession;
};

export default function SessionParticipantsTable({
  sessionId,
  userData,
  onIncludeInSummaryChange,
}: {
  sessionId: string;
  userData: UserSession[];
  onIncludeInSummaryChange: (userId: string, included: boolean) => void;
}) {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);

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

  const sortableData: ParticipantsTableData[] = userData.map((data) => ({
    userName: data.user_name ?? 'anonymous',
    sessionStatus: data.active ? 'Started' : 'Finished',
    createdDate: new Date(data.start_time),
    updatedDate: new Date(data.last_edit),
    includeInSummary: data.include_in_summary,
    userData: data,
  }));

  const getTableRow = (sortableData: ParticipantsTableData, index: number) => {
    return (
      <ParticipantSessionRow
        key={index}
        tableData={sortableData}
        onIncludeChange={onIncludeInSummaryChange}
      />
    );
  };

  const handleFileUploaded = () => {
    setFileRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Participants</CardTitle>
            <CardDescription>
              View participants progress and transcripts
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => setIsGenerateModalOpen(true)}
            >
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
              data={sortableData}
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
          onFileUploaded={handleFileUploaded}
        />
      </Card>

      <SessionFilesTable
        sessionId={sessionId}
        refreshTrigger={fileRefreshTrigger}
      />
    </>
  );
}
