import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Message, SessionRating } from '@/lib/schema';
import { useEffect, useState } from 'react';
import { ChatMessage } from '../ChatMessage';
import { getAllChatMessagesInOrder, getThreadRating } from '@/lib/db';
import { ParticipantsTableData } from './SessionParticipantsTable';
import { Spinner } from '../icons';
import { Switch } from '../ui/switch';
import { MessageSquare, Star, X } from 'lucide-react';
import * as db from '@/lib/db';
import { useUpsertUserSessions } from '@/stores/SessionStore';

const EMOJI_RATINGS = [
  {
    emoji: '😫',
    label: 'Very dissatisfied',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    emoji: '🙁',
    label: 'Dissatisfied',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    emoji: '😐',
    label: 'Neutral',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  {
    emoji: '🙂',
    label: 'Satisfied',
    color: 'bg-lime-50 text-lime-700 border-lime-200',
  },
  {
    emoji: '😊',
    label: 'Very satisfied',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
];

export default function ParicipantSessionRow({
  tableData,
}: {
  tableData: ParticipantsTableData;
}) {
  const userData = tableData.userData;
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rating, setRating] = useState<SessionRating | null>(null);
  const [isLoading, setIsLoading] = useState(false);  
  const updateUserSession = useUpsertUserSessions();

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
    setIsLoading(true);
    try {
      const [messageHistory, threadRating] = await Promise.all([
        getAllChatMessagesInOrder(userData.thread_id),
        getThreadRating(userData.thread_id),
      ]);

      if (messageHistory.length === 0) {
        console.error(
          'No messages found for ',
          userData.thread_id,
          ' but it should be there!',
        );
        return;
      }

      setMessages(messageHistory);
      setRating(threadRating);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
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

      {isPopupVisible && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleCloseClick}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-11/12 h-[85vh] md:w-4/5 lg:w-3/4 flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {tableData.userName}'s Conversation
                </h2>
                {rating && (
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${EMOJI_RATINGS[rating.rating - 1].color}`}
                    >
                      <span className="text-xl">
                        {EMOJI_RATINGS[rating.rating - 1].emoji}
                      </span>
                      <span className="font-medium">{rating.rating}/5</span>
                      <span className="text-sm">
                        - {EMOJI_RATINGS[rating.rating - 1].label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseClick}
                className="rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4 rounded-b-xl">
              {rating?.feedback && (
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <h3 className="font-medium text-blue-900">
                      Participant's Feedback
                    </h3>
                  </div>
                  <p className="text-blue-800 pl-7">"{rating.feedback}"</p>
                </div>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8">
                      <Spinner />
                    </div>
                    <p className="text-sm text-gray-600">
                      Loading conversation...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      message={message}
                      showButtons={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
