'use client';

import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Session } from './session';
import { AccumulatedSessionData } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/icons';

type SessionData = {
  sessionId: string;
  name: string;
  status: string;
  active: boolean;
  numStarted: string;
  numFinished: string;
  createdOn: string
};

export function SessionsTable({
  sessions,
  offset,
  totalSessions,
}: {
  sessions: Record<string, AccumulatedSessionData>;
  offset: number;
  totalSessions: number;
  }) {
  
  const defaultSort = (sortDirection, a, b) => {
    if (a > b) return sortDirection === 'asc' ? 1 : -1;
    if (a < b) return sortDirection === 'asc' ? -1 : 1;
    return 0;
  };

  const TableHeaders = {
    name: { label: 'Name', className: '', sortBy: defaultSort },
    status: { label: 'Status', className: '', sortBy: defaultSort },
    started: {
      label: 'Started',
      className: 'hidden md:table-cell',
      sortBy: defaultSort,
    },
    finished: {
      label: 'Finished',
      className: 'hidden md:table-cell',
      sortBy: defaultSort,
    },
    createdOn: {
      label: 'Created on',
      className: 'hidden md:table-cell',
      sortBy: (sortDirection, aValue, bValue) => {
        return sortDirection === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      },
    },
  } as const;

  type TableHeaderKey = keyof typeof TableHeaders;

  const [sortColumn, setSortColumn] = useState<TableHeaderKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortedSessions, setSortedSessions] = useState([]);
  console.log(sessions);
  const cleanSessions: SessionData = Object.entries(sessions)
    .map(([sessionId, session]) => {
      const name =
        session.session_data.template &&
        !session.session_data.template.startsWith('asst_')
          ? session.session_data.template
          : session.session_data.topic;

      const numSessions = session.session_data.num_sessions;
      const numActive = session.session_data.num_active;
      const numFinished = session.session_data.num_finished;
      
      const finalReportSent = session.session_data.finalReportSent || false;

      const createdOn = session.session_data.start_time
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(session.session_data.start_time))
        : `No start time`;

      return {
        sessionId,
        name,
        status: (numFinished < numSessions ? 'adad' : 'Finished') + finalReportSent ? ' ✅' : '',
        active: session.session_data.session_active,
        numStarted: numActive, 
        numFinished,
        createdOn,
      };
    })
    .filter((cleaned) => {
      return !!cleaned.name;
    });

  const sortSessions = (column: TableHeaderKey) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    setSortedSessions(
      Object.entries(cleanSessions).sort(([, a], [, b]) => {
        if (!sortColumn) return 0;
        const aValue = a[sortColumn as keyof TableHeaderKey];
        const bValue = b[sortColumn as keyof TableHeaderKey];

        return TableHeaders[sortColumn].sortBy(sortDirection, aValue, bValue);
      })
    );
  }, [sessions, sortColumn, sortDirection]);

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {Object.entries(TableHeaders).map(
                ([key, { label, className }]) => (
                  <TableHead
                    key={key}
                    onClick={() => sortSessions(key as TableHeaderKey)}
                    className={`cursor-pointer ${className}`}
                  >
                    {label}{' '}
                    {sortColumn === key &&
                      (sortDirection === 'asc' ? '▲' : '▼')}
                  </TableHead>
                )
              )}
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSessions.length > 0 ? (
              sortedSessions.map(([sessionId, session]) => (
                <Session key={sessionId} session={session} />
              ))
            ) : (
              <TableRow>
                <td colSpan={Object.keys(TableHeaders).length+1} className="text-center">
                  <div className='flex items-center justify-center m-4'><Spinner /></div>
                </td>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
