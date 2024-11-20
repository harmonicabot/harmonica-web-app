import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import ParticipantSessionRow from './ParticipantSessionRow';
import SortableTable from '../SortableTable';
import { UserSession } from '@/lib/schema_updated';

export default function SessionResultParticipants({
  userData,
}: {
  userData: UserSession[];
}) {
  type Data = {
    userName: string;
    sessionStatus: string;
    userData: UserSession;
  };

  const tableHeaders: Array<{
    label: string;
    sortKey: keyof Data;
    className?: string;
  }> = [
    { label: 'Name', sortKey: 'userName', className: '' },
    { label: 'Status', sortKey: 'sessionStatus' },
  ];

  const sortableData: Data[] = userData
    .map((data) => ({
      userName: data.user_name ?? 'anonymous',
      sessionStatus: data.active ? 'Started' : 'Finished',
      userData: data,
    }));

  const getTableRow = (session: Data, index: number) => {
    return <ParticipantSessionRow key={index} {...session} />;
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
        />
      </CardContent>
    </Card>
  );
}
