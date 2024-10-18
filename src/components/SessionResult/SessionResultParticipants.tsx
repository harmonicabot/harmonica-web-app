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
import ParticipantSessionCell from './ParticipantSessionCell';

interface SessionResultParticipantsProp {
  userData: any[];
}

export default function SessionResultParticipants({
  userData,
}: SessionResultParticipantsProp) {
  return (
    <Card className="mt-4 w-full md:w-2/3">
      <CardHeader>
        <CardTitle className="text-xl">Participants</CardTitle>
        <CardDescription>
          View participants progress and transcripts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              {/* <TableHead className="hidden md:table-cell">
                Include in summary
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Started at
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Finished at
              </TableHead> */}
              <TableHead></TableHead>
              {/* <TableHead></TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {userData
              .filter((session) => session.chat_text)
              .map((session, index) => (
                <ParticipantSessionCell key={index} session={session} />
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
