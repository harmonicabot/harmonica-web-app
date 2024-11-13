import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import ParticipantSessionRow from './ParticipantSessionRow';
import SortableTable from '../SortableTable';
import { UserSession } from '@/lib/schema';

export default function SessionResultParticipants({
  userData,
}: {
  userData: UserSession[];
}) {
  type Data = {
    userName: string;
    sessionStatus: string;
    session: UserSession;
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
      userName: extractName(session.chat_text!),
      sessionStatus: session.active ? 'Started' : 'Finished',
      session: session,
    }));

  function extractName(input: string): string {
    const prefix = ' : User name is ';
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
