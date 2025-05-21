import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Message } from '@/lib/schema';
import { useEffect, useState } from 'react';
import { ChatMessage } from '../ChatMessage';
import { getAllChatMessagesInOrder } from '@/lib/db';
import { ParticipantsTableData } from './SessionParticipantsTable';
import { Spinner } from '../icons';
import { Switch } from '../ui/switch';
import { LockIcon } from 'lucide-react';

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
  const [includeInSummary, setIncludeInSummary] = useState(
    tableData.includeInSummary
  );

  const handleIncludeInSummaryUpdate = async (updatedIncluded: boolean) => {
    // Only allow changes if the participant can be included (within limit)
    if (tableData.canViewTranscript) {
      onIncludeChange(userData.id, updatedIncluded);
      setIncludeInSummary(updatedIncluded);
    }
  };

  const handleViewClick = async () => {
    // Only allow viewing transcript if within limit
    if (!tableData.canViewTranscript) return;
    
    setIsPopupVisible(true);
    const messageHistory = await getAllChatMessagesInOrder(userData.thread_id);

    if (messageHistory.length === 0) {
      console.error(
        'No messages found for ',
        userData.thread_id,
        ' but it should be there!'
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
      <TableRow className={tableData.isLimited ? "opacity-60" : ""}>
        <TableCell 
          onClick={handleViewClick} 
          className={`font-medium ${tableData.canViewTranscript ? "cursor-pointer" : "cursor-not-allowed"}`}
        >
          {tableData.userName}
          {!tableData.canViewTranscript && (
            <LockIcon size={14} className="inline ml-2 text-gray-400" />
          )}
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
          <Switch
            checked={includeInSummary}
            onCheckedChange={handleIncludeInSummaryUpdate}
            disabled={!tableData.canViewTranscript}
          ></Switch>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <Button 
            variant="secondary" 
            onClick={handleViewClick}
            disabled={!tableData.canViewTranscript}
            className={!tableData.canViewTranscript ? "opacity-50 cursor-not-allowed" : ""}
          >
            View
          </Button>
        </TableCell>
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
