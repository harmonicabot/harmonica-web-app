import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { deleteSession as deleteSession } from './actions';
import { AccumulatedSessionData } from '@/lib/types';

export function Session({ session }: { session: AccumulatedSessionData }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{session.session_data.topic}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {session.session_data.active ?  'active' : session.session_data.finished ? 'finished' : session.session_data.finalReportSent ? 'report sent' : 'report not sent'}
        </Badge>
      </TableCell>
      <TableCell>{  }</TableCell>
      <TableCell className="hidden md:table-cell">
        {new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(session.session_data.start_time)}
      </TableCell>
      <TableCell>
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
              <form action={deleteSession}>
                <button type="submit">Delete</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
