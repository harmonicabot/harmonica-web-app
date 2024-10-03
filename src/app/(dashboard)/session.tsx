import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { deleteSession as deleteSession } from './actions';
import { AccumulatedSessionData, UserSessionData } from '@/lib/types';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, UserCheck } from '@/components/icons';

export function Session({ session }: { session: AccumulatedSessionData }) {
  const router = useRouter();
  // console.log('Session data:', session);
  const totalUsers = Object.keys(session.user_data).length;

  const activeUsers = Object.values(session.user_data)
    .map((user) => (user.active ? 1 : 0))
    .reduce((a, b) => a + b, 0);

  const inactiveUsers = totalUsers - activeUsers;

  if (!session.session_data.topic) {
    return null;
  }

  // console.log('Start time: ', session.session_data.start_time);
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/sessions/${session.session_data.session_id}`}>
          {session.session_data.template &&
          !session.session_data.template.startsWith('asst_')
            ? session.session_data.template
            : session.session_data.topic}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {session.session_data.finalReportSent ? 'finished' : 'active'}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <User />
          {activeUsers}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center">
          <UserCheck className="mr-2 h-4 w-4 opacity-50" />
          {inactiveUsers}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {session.session_data.start_time
          ? new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(session.session_data.start_time))
          : `No start time`}
      </TableCell>
      <TableCell>
        <Link href={`/sessions/${session.session_data.session_id}`}>
          <Button variant="secondary">View</Button>
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
