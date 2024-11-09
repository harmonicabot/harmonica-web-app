'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Session } from './session';
import {
  AllSessionsData,
  HostAndSessionData,
  UserSessionData,
} from '@/lib/types';
import { Key, useState } from 'react';
import SortableTable from '@/components/SortableTable';

// export type SessionData = {
//   sessionId: string;
//   name: string;
//   status: string;
//   active: boolean;
//   numActive: number;
//   numFinished: number;
//   createdOn: string;
//   hostData: SessionOverview;
//   userData: Record<string, UserSessionData>;
// };

export function SessionsTable({ sessions }: { sessions: AllSessionsData }) {
  const tableHeaders = [
    {
      label: 'Name',
      sortKey: 'name',
      className: 'cursor-pointer',
    },
    {
      label: 'Status',
      sortKey: 'status',
      className: 'cursor-pointer',
    },
    {
      label: 'Started',
      sortKey: 'numActive',
      className: 'hidden md:table-cell',
    },
    {
      label: 'Finished',
      sortKey: 'numFinished',
      className: 'hidden md:table-cell',
    },
    {
      label: 'Created on',
      sortKey: 'createdOn',
      className: 'hidden md:table-cell',
      sortBy: (sortDirection: string, a: string, b: string) => {
        return sortDirection === 'asc'
          ? new Date(a).getTime() - new Date(b).getTime()
          : new Date(b).getTime() - new Date(a).getTime();
      },
    },
  ];

  const getActiveFinished = (
    userData: UserSessionData[]
  ): { started: number; finished: number } => {
    let started = 0;
    let finished = 0;

    userData.forEach((user) => {
      if (user.chat_text && user.chat_text.length > 0) {
        started++;
        if (!user.active) {
          finished++;
        }
      }
    });

    return { started, finished };
  };

  const [tableSessions, setTableSessions] = useState<HostAndSessionData[]>(
    Object.values(sessions)
  );

  const handleOnDelete = (deleted: HostAndSessionData) => {
    console.log('Deleted session, now updating table');
    setTableSessions((prevSessions) =>
      prevSessions.filter(
        (session) => session.host_data.id !== deleted.host_data.id
      )
    );
  };

  const getTableRow = (session: HostAndSessionData, index: Number) => {
    return (
      <Session key={index as Key} session={session} onDelete={handleOnDelete} />
    );
  };

  return (
    <Card>
      <CardContent>
        <SortableTable
          tableHeaders={tableHeaders}
          getTableRow={getTableRow}
          data={tableSessions}
        />
      </CardContent>
      {/* <CardFooter>
        <form className="flex items-center w-full justify-between">
          <div className="text-xs text-muted-foreground">
            Showing{' '}
            <strong>
              {Math.min(Math.max(-1, offset - sessionsPerPage), totalSessions) +
                1}
              -{offset}
            </strong>{' '}
            of <strong>{totalSessions}</strong> sessions
          </div>
          <div className="flex">
            <Button
              formAction={prevPage}
              variant="ghost"
              size="sm"
              type="submit"
              disabled={offset === sessionsPerPage}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Prev
            </Button>
            <Button
              formAction={nextPage}
              variant="ghost"
              size="sm"
              type="submit"
              disabled={offset + sessionsPerPage > totalSessions}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardFooter> */}
    </Card>
  );
}
