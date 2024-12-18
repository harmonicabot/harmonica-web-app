'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Session } from './session';
import { Key, useEffect, useState } from 'react';
import SortableTable from '@/components/SortableTable';
import { HostSession } from '@/lib/schema_updated';
import * as db from '@/lib/db';
import { getUserStats } from '@/lib/clientUtils';

export type SessionTableData = {
  id: string;
  topic: string;
  status: string;
  active: boolean;
  num_sessions: number;
  num_finished: number;
  created_on: string;
};

export function SessionsTable({ sessions }: { sessions: HostSession[] }) {
  const tableHeaders = [
    {
      label: 'Name',
      sortKey: 'topic',
      className: 'cursor-pointer',
    },
    {
      label: 'Status',
      sortKey: 'status',
      className: 'cursor-pointer',
    },
    {
      label: 'Started',
      sortKey: 'num_sessions',
      className: 'hidden md:table-cell',
    },
    {
      label: 'Finished',
      sortKey: 'num_finished',
      className: 'hidden md:table-cell',
    },
    {
      label: 'Created on',
      sortKey: 'created_on',
      className: 'hidden md:table-cell',
      sortBy: (sortDirection: string, a: string, b: string) => {
        return sortDirection === 'asc'
          ? new Date(a).getTime() - new Date(b).getTime()
          : new Date(b).getTime() - new Date(a).getTime();
      },
    },
  ];

  const [tableSessions, setTableSessions] = useState<SessionTableData[]>([]);

  useEffect(() => {
    setAsSessionTableData(sessions);
  }, []);

  async function setAsSessionTableData(sessions: HostSession[]) {
    const sessionToUserStats = await db.getNumUsersAndMessages(sessions.map(s => s.id)); 
    const asSessionTableData = sessions
      .map((session) => {
        const {totalUsers, finishedUsers} = getUserStats(sessionToUserStats, session.id)
        if (!session || !session.topic) return;
        const status = 
          !session.active || session.final_report_sent
            ? 'Finished'
            : totalUsers === 0
            ? 'Draft'
            : 'Active';
        const created_on = new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(session.start_time));

        return {
          id: session.id,
          topic: session.topic,
          status: status,
          active: session.active,
          num_sessions: totalUsers,
          num_finished: finishedUsers,
          created_on,
        };
      }).filter((session) => session !== undefined);
    if (asSessionTableData !== undefined) {
      setTableSessions(asSessionTableData);
    }
  }

  const handleOnDelete = (deletedId: string) => {
    console.log('Deleted session, now updating table');
    setTableSessions((prevSessions) =>
      prevSessions.filter((session) => session.id !== deletedId)
    );
  };

  const getTableRow = (session: SessionTableData, index: Number) => {
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
          defaultSort={{ column: 'created_on', direction: 'desc' }}
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
