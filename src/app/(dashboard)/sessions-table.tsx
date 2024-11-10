'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Session } from './session';
import {
  AllSessionsData,
  HostAndUserData,
} from '@/lib/types';
import { Key, useEffect, useState } from 'react';
import SortableTable from '@/components/SortableTable';

export type SessionData = {
  sessionId: string;
  name: string;
  status: string;
  active: boolean;
  num_sessions: number;
  num_finished: number;
  created_on: string;
  data: HostAndUserData;
};

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

  const [tableSessions, setTableSessions] = useState<SessionData[]>([]);

  useEffect(() => {
    const asSessionData: SessionData[] = Object.entries(sessions)
      .map(([sessionId, session]) => {
        const host = session.host_data;
        const topic = host.topic;
        const template = host.template;
        const name = topic
          ? topic
          : template && !template.startsWith('asst_')
            ? template
            : null;

        const status = !host.active
                ? 'Finished'
                : host.num_sessions === 0
                  ? 'Draft'
            : 'Active';
        const created_on = new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(host.start_time));

        return {
          sessionId,
          name: name || '',
          status: status,
          active: host.active,
          num_sessions: host.num_sessions,
          num_finished: host.num_finished,
          created_on,
          data: session,
        };
      })
      .filter((cleaned) => {
        return !!cleaned.name;
      })
    setTableSessions(asSessionData);
  }, [sessions]);

  const handleOnDelete = (deleted: SessionData) => {
    console.log('Deleted session, now updating table');
    setTableSessions((prevSessions) =>
      prevSessions.filter(
        (session) => session.sessionId !== deleted.sessionId
      )
    );
  };

  const getTableRow = (session: SessionData, index: Number) => {
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
