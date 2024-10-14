import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { AccumulatedSessionData } from '@/lib/types';
import Link from 'next/link';
import { User, UserCheck } from '@/components/icons';

export function Session({ session }: { session: SessionData }) {

  return (
    <TableRow>
      <TableCell className="font-medium text-base">
        <Link href={`/sessions/${session.sessionId}`}>
          {session.name}
        </Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize ${
            session.active
              ? 'bg-lime-100 text-lime-900'
              : session.finished
                ? 'bg-purple-100 text-purple-900'
                : ''
          }`}
        >
          {session.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <User />
          {session.numStarted}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <UserCheck className="mr-1 h-4 w-4 opacity-50" />
          {session.numFinished}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {session.createdOn}
      </TableCell>
      <TableCell>
        <Link href={`/sessions/${session.sessionId}`}>
          <Button variant="outline">View</Button>
        </Link>
      </TableCell>
      {/* <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>
              <form action={() => deleteSession(session)}>
                <button type="submit">Delete</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell> */}
    </TableRow>
  );
}
