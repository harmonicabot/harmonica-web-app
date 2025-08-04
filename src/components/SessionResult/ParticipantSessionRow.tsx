import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { ParticipantsTableData } from './SessionParticipantsTable';
import { Switch } from '../ui/switch';
import { useUpsertUserSession } from '@/stores/SessionStore';
import TranscriptPopup from './TranscriptPopup';

export default function ParicipantSessionRow({
  tableData,
}: {
  tableData: ParticipantsTableData;
}) {
  const userData = tableData.userData;
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const updateUserSession = useUpsertUserSession();

  const handleIncludeInSummaryUpdate = async (included: boolean) => {
    // Updates the store & db
    updateUserSession.mutate({
      ...userData,
      include_in_summary: included,
      last_edit: new Date()
    });
  };

  const handleViewClick = async () => {
    setIsPopupVisible(true);
  };

  const handleCloseClick = () => {
    setIsPopupVisible(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseClick();
      }
    };

    if (isPopupVisible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isPopupVisible]);

  return (
    <>
      <TableRow
        className="group hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={handleViewClick}
      >
        <TableCell className="font-medium">{tableData.userName}</TableCell>
        <TableCell className="hidden md:table-cell">
          <Badge
            variant="outline"
            className={
              userData.active ? 'capitalize' : 'capitalize bg-[#ECFCCB]'
            }
          >
            {tableData.sessionStatus}
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(tableData.createdDate)}
        </TableCell>
        <TableCell>
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(tableData.updatedDate)}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Switch
            checked={tableData.includeInSummary}
            onCheckedChange={handleIncludeInSummaryUpdate}
            onClick={(e) => e.stopPropagation()}  // Stops the 'View' popping up
          />
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleViewClick();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            View
          </Button>
        </TableCell>
      </TableRow>

      {isPopupVisible &&
        <TranscriptPopup
          threadId={userData.thread_id}
          handleCloseClick={handleCloseClick}
          userName={tableData.userName}
        />
      }
    </>
  );
}
