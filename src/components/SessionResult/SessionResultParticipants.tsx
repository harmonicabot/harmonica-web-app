import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import ParticipantSessionRow from './ParticipantSessionRow';
import SortableTable from '../SortableTable';
import { UserSessionData } from '@/lib/types';

export default function SessionResultParticipants({
  userData,
}: {
  userData: UserSessionData[];
}) {
  type Data = {
    userName: string;
    sessionStatus: string;
    session: UserSessionData;
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
    .filter((session) => session.chat_text)
    .map((session) => ({
      userName: extractName(session.chat_text),
      sessionStatus: session.active ? 'Started' : 'Finished',
      session: session,
    }));

  console.log('sortableData: ', sortableData);
  console.log('sortableData[0]: ', sortableData[0]);

  function extractName(input: string): string {
    const prefix = 'Question : User name is ';
    const startIndex = input.indexOf(prefix);
    if (startIndex === -1) return 'anonymous';

    const nameStart = startIndex + prefix.length;
    let nameEnd = input.length;

    for (let i = nameStart; i < input.length; i++) {
      if (input[i] === '.' || input.slice(i, i + 6) === 'Answer') {
        nameEnd = i;
        break;
      }
    }

    const name = input.slice(nameStart, nameEnd).trim();
    return name || 'anonymous';
  }

  const getTableRow = (session: Data, index) => {
    console.log('session before passing to ParticipantSessionCell: ', session);
    return <ParticipantSessionRow key={index} {...session} />;
  };

  return (
    <Card className="mt-4 w-full md:w-2/3">
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
