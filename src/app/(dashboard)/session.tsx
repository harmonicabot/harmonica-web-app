import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { encryptId } from '@/lib/encryptionUtils';
import Link from 'next/link';
import { User, UserCheck } from '@/components/icons';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { deleteSession } from './actions';
import { SessionData } from './sessions-table';

export function Session({
  session,
  onDelete,
}: {
  session: SessionData;
  onDelete: (sessionId: string) => void;
  }) {

  return (
    <TableRow>
      <TableCell className="font-medium text-base">
        <Link href={`/sessions/${encryptId(session.id)}`}>{session.topic}</Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize ${
            session.active && session.num_sessions > 0 && session.num_sessions > session.num_finished
              ? 'bg-lime-100 text-lime-900'
              : session.active && session.num_sessions === 0 // Draft
                ? 'bg-purple-100 text-purple-900'
                : ''  // Finished, remain white
          }`}
        >
          {session.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <User />
          {session.num_sessions}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <UserCheck className="mr-1 h-4 w-4 opacity-50" />
          {session.num_finished}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {session.created_on}
      </TableCell>
      <TableCell>
        <Link href={`/sessions/${encryptId(session.id)}`}>
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
                  if (await deleteSession(session.id)) {
                    onDelete(session.id);
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
