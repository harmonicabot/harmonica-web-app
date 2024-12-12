import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import ParticipantSessionRow from './ParticipantSessionRow';
import SortableTable, { TableHeaderData } from '../SortableTable';
import { UserSession } from '@/lib/schema_updated';

export type ParticipantsTableData = {
  userName: string;
  sessionStatus: string;
  createdDate: Date;
  updatedDate: Date;
  includeInSummary: boolean;
  userData: UserSession;
};

export default function SessionResultParticipants({
  userData,
}: {
  userData: UserSession[];
}) {
  const dateSorter = (sortDirection: string, a: string, b: string) => {
    return sortDirection === 'asc'
      ? new Date(a).getTime() - new Date(b).getTime()
      : new Date(b).getTime() - new Date(a).getTime();
  };
  const tableHeaders: TableHeaderData[] = [
    { label: 'Name', sortKey: 'userName', className: '' },
    { label: 'Status', sortKey: 'sessionStatus' },
    { label: 'Created', sortKey: 'createdDate', sortBy: dateSorter },
    { label: 'Updated', sortKey: 'updatedDate', sortBy: dateSorter },
    {
      label: 'Include in summary',
      sortKey: 'includeInSummary',
      sortBy: (dir, a: boolean, b: boolean) => {
        return dir === 'asc' ? Number(b) - Number(a) : Number(a) - Number(b)
      }
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
    return <ParticipantSessionRow key={index} tableData={sortableData} />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Participants</CardTitle>
        <CardDescription>
          View participants progress and transcripts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SortableTable
          tableHeaders={tableHeaders}
          getTableRow={getTableRow}
          data={sortableData}
          defaultSort={{ column: 'updatedDate', direction: 'desc' }}
        />
      </CardContent>
    </Card>
  );
}
