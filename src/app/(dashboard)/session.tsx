import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { HostAndSessionData } from '@/lib/types';
import Link from 'next/link';
import { User, UserCheck } from '@/components/icons';

// import { SessionData } from './sessions-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { deleteSession } from './actions';

export function Session({
  session,
  onDelete,
}: {
  session: HostAndSessionData;
  onDelete: (session: HostAndSessionData) => void;
  }) {
  
  const numActive = session.host_data.num_sessions - session.host_data.num_finished;
  const status = !session.host_data.active
          ? 'Finished'
          : session.host_data.num_sessions === 0
            ? 'Draft'
      : 'Active';
  const createdOn = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(session.host_data.start_time));

  return (
    <TableRow>
      <TableCell className="font-medium text-base">
        <Link href={`/sessions/${session.host_data.id}`}>{session.host_data.topic}</Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize ${
            session.host_data.active && numActive > 0
              ? 'bg-lime-100 text-lime-900'
              : session.host_data.active && numActive === 0
                ? 'bg-purple-100 text-purple-900'
                : ''
          }`}
        >
          {status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <User />
          {numActive}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <UserCheck className="mr-1 h-4 w-4 opacity-50" />
          {session.host_data.num_finished}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {createdOn}
      </TableCell>
      <TableCell>
        <Link href={`/sessions/${session.host_data.id}`}>
          <Button variant="outline">View</Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-haspopup="true" size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {/* <DropdownMenuItem>
              <form action={() => createNewSession(session)}>
                <button type="submit">Use for new session</button>
              </form>
            </DropdownMenuItem>
            <DropdownMenuItem>
            <form action={() => archiveSession(session)}>
                <button type="submit">Archive</button>
              </form>
            </DropdownMenuItem> */}
            <DropdownMenuItem>
              <form
                action={async () => {
                  if (await deleteSession(session)) {
                    onDelete(session);
                  }
                }}
              >
                <button type="submit">Delete</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
