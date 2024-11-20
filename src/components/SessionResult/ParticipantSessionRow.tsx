import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Message, UserSession } from '@/lib/schema_updated';
import { useEffect, useState } from 'react';
import { ChatMessage } from '../ChatMessage';
import { getAllChatMessagesInOrder } from '@/lib/db';

interface SessionData {
  userName: string;
  sessionStatus: string;
  userData: UserSession;
}

export default function ParicipantSessionRow({
  userName,
  sessionStatus,
  userData,
}: SessionData) {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleViewClick = async () => {
    const messageHistory = await getAllChatMessagesInOrder(userData.thread_id);
    console.log('Messages fetched: ', messageHistory);
    setMessages(messageHistory);

    setIsPopupVisible(true);
  };

  const handleCloseClick = () => {
    console.log('Close clicked');
    setIsPopupVisible(false);
  };

  // const userName = session.chat_text
  //   ? extractName(session.chat_text)
  //   : `User ${session.user_id}`;

  // All users passed into this method should also have some messages.

  function removeFirstQuestion(input: string): string {
    const answerIndex = input.indexOf('Answer');
    return answerIndex !== -1 ? input.slice(answerIndex) : input;
  }

  function parseMessages(
    input: string,
  ) {
    try {
      const regex =
        /(Answer|Question)\s*:\s*([\s\S]*?)(?=(Answer|Question)\s*:|$)/g;
      const matches = [...input.matchAll(regex)];

      return matches.map((match) => ({
        type: match[1] === 'Answer' ? 'AI' : 'USER',
        text: match[2].trim(),
      }));
    } catch (error) {
      console.error('Error parsing messages:', error);
      return [];
    }
  }

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
    <TableRow>
      <TableCell onClick={handleViewClick} className="font-medium">
        {userName}
      </TableCell>
      <TableCell>
        {isPopupVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-purple-100 border-purple-200 p-8 rounded-lg w-4/5 h-4/5 md:w-3/5 md:h-3/5 lg:w-1/2 lg:h-3/4 flex flex-col">
              <div className="flex justify-between mb-4">
                <h2 className="text-2xl font-bold">{userName} transcript</h2>
                <Button onClick={handleCloseClick}>Close</Button>
              </div>

              <div className="flex-1 overflow-auto rounded-lg">
                { messages.map((message, index) => (
                    <ChatMessage key={index} message={message} />
                  ))
                }
              </div>
            </div>
          </div>
        )}
        <Badge
          variant="outline"
          className={userData.active ? 'capitalize' : 'capitalize bg-[#ECFCCB]'}
        >
          {sessionStatus}
        </Badge>
      </TableCell>
      {/* <TableCell>
        <Switch></Switch>
      </TableCell> */}
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
  );
}
