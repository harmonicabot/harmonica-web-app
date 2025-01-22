import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Message, UserSession } from '@/lib/schema';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../ChatMessage';
import { getAllChatMessagesInOrder, updateUserSession } from '@/lib/db';
import { ParticipantsTableData } from './SessionParticipantsTable';
import { Spinner } from '../icons';
import { Switch } from '../ui/switch';

export default function ParicipantSessionRow({
  tableData,
  onIncludeChange,
}: {
    tableData: ParticipantsTableData;
    onIncludeChange: (userId: string, included: boolean) => void;
}) {
  const userData = tableData.userData;
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [includeInSummary, setIncludeInSummary] = useState(tableData.includeInSummary);

  useEffect(() => {
    setIncludeInSummary(tableData.includeInSummary);
  }, [tableData.includeInSummary]);

  const handleIncludeInSummaryUpdate = async () => {
    // State updates are NOT immediate, so need to assign this to a temp var
    const updatedValue = !includeInSummary;
    setIncludeInSummary(updatedValue);
    await updateUserSession(userData.id, { 
      include_in_summary: updatedValue
    });
    onIncludeChange(userData.id, updatedValue);
  };

  const handleViewClick = async () => {
    setIsPopupVisible(true);
    const messageHistory = await getAllChatMessagesInOrder(userData.thread_id);

    if (messageHistory.length === 0) {
      console.error(
        'No messages found for ',
        userData.thread_id,
        ' but it should be there!',
      );
      return;
    }

    setMessages(messageHistory);
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

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <TableRow>
        <TableCell onClick={handleViewClick} className="font-medium">
          {tableData.userName}
        </TableCell>
        <TableCell className='hidden md:table-cell'>
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
        <Switch checked={includeInSummary} onCheckedChange={handleIncludeInSummaryUpdate}></Switch>
      </TableCell>
        {/* <TableCell className="hidden md:table-cell">
        2023-07-12 10:42 AM
      </TableCell>
      <TableCell className="hidden md:table-cell">
        2023-07-12 12:42 AM
      </TableCell> */}
        <TableCell className="hidden md:table-cell">
          <Button variant="secondary" onClick={handleViewClick}>
            View
          </Button>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell> */}
      </TableRow>
      {isPopupVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-purple-100 border-purple-200 p-8 rounded-lg w-4/5 h-4/5 md:w-3/5 md:h-3/5 lg:w-1/2 lg:h-3/4 flex flex-col">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {tableData.userName} transcript
              </h2>
              <Button onClick={handleCloseClick}>Close</Button>
            </div>

            <div className="flex-1 overflow-auto rounded-lg">
              {messages.length > 0 ? (
                messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))
              ) : (
                <div className="flex items-center justify-center m-4">
                  <Spinner /> Loading Transcript ...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
