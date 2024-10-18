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
import {
  AccumulatedSessionData,
  SessionOverview,
  UserSessionData,
} from '@/lib/types';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/icons';
import SortableTable from '@/components/SortableTable';

export type SessionData = {
  sessionId: string;
  name: string;
  status: string;
  active: boolean;
  numActive: number;
  numFinished: number;
  createdOn: string;
  hostData: SessionOverview;
  userData: Record<string, UserSessionData>;
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
  const tableHeaders = [
    {
      label: 'Name',
      sortKey: 'name',
      className: 'cursor-pointer',
    },
    {
      label: 'Status',
      sortKey: 'status',
      className: 'cursor-pointer'
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
      sortBy: (sortDirection, a, b) => {
        return sortDirection === 'asc'
          ? new Date(a).getTime() - new Date(b).getTime()
          : new Date(b).getTime() - new Date(a).getTime();
      },
    },
  ];

  const cleanSessions: SessionData[] = Object.entries(sessions)
    .map(([sessionId, session]) => {
      const topic = session.session_data.topic;
      const template = session.session_data.template;
      const name = topic
        ? topic
        : template && !template.startsWith('asst_')
        ? template
        : null;

      const numActive = session.session_data.num_active;
      const numFinished = session.session_data.num_finished;
      const finalReportSent = session.session_data.finalReportSent || false;
      const session_active = session.session_data.session_active;

      const activeFinishedDraft = !session_active
        ? 'Finished'
        : numActive === 0
        ? numFinished > 0
          ? 'Finished'
          : 'Draft'
        : 'Active';
      const statusText = `${activeFinishedDraft}${
        finalReportSent ? ' ✅' : ''
      }`;

      const createdOn = session.session_data.start_time
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(session.session_data.start_time))
        : `No start time`;

      return {
        sessionId,
        name,
        status: statusText,
        active: session.session_data.session_active,
        numActive: numActive,
        numFinished,
        createdOn,
        hostData: session.session_data,
        userData: session.user_data,
      };
    })
    .filter((cleaned) => {
      return !!cleaned.name;
    });

  const handleOnDelete = (deleted: SessionData) => {
    const pos = cleanSessions.findIndex(
      (cleaned) => cleaned.sessionId === deleted.sessionId
    );
    cleanSessions.splice(pos,1);
  };

  const getTableRow = (session: SessionData, index) => {
    return <Session key={index} session={session} onDelete={handleOnDelete} />;
  };

  return (
    <Card>
      <CardContent>
        <SortableTable
          tableHeaders={tableHeaders}
          getTableRow={getTableRow}
          data={cleanSessions}
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
