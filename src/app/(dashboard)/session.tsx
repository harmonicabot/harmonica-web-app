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
import { useEffect, useState } from 'react';

export function Session({ session }: { session: AccumulatedSessionData }) {

  console.log('Session data:', session);
  const totalUsers = Object.keys(session.user_data).length;
  
  const activeUsers = Object.values(session.user_data)
    .map(user => user.active ? 1 : 0)
    .reduce((a, b) => a + b, 0);
  
  const inactiveUsers = totalUsers - activeUsers;

  if (!session.session_data.topic) {
    return null;
  }
  console.log('Start time: ', session.session_data.start_time);
  return (
    <TableRow>
      <TableCell className="font-medium">{(session.session_data.template && !session.session_data.template.startsWith("asst_")) ? session.session_data.template : session.session_data.topic}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {session.session_data.active ?  'active' : session.session_data.finished ? 'finished' : session.session_data.finalReportSent ? 'report sent' : 'report not sent'}
        </Badge>
      </TableCell>
      <TableCell>{ activeUsers }</TableCell>
      <TableCell>{ inactiveUsers }</TableCell>
      <TableCell className="hidden md:table-cell">
        {session.session_data.start_time ? (
          new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
          }).format(new Date(session.session_data.start_time))
        ) : (`No start time`)}
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
              <form action={() => deleteSession(session)}>
                <button type="submit">Delete</button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
