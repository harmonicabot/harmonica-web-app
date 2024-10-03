import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { UserSessionData } from '@/lib/types';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import Markdown from 'react-markdown';

export default function ParicipantSessionCell({
  session,
}: {
  session: UserSessionData;
}) {
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const handleViewClick = () => {
    setIsPopupVisible(true);
  };

  const handleCloseClick = () => {
    setIsPopupVisible(false);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">User {session.user_id}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={session.active ? 'capitalize' : 'capitalize bg-[#ECFCCB]'}
        >
          {session.active ? 'Started' : 'Finished'}
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
        {isPopupVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg w-4/5 h-4/5 md:w-3/5 md:h-3/5 lg:w-1/2 lg:h-3/4 flex flex-col">
              <div className="flex justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  User {session.user_id} transcript
                </h2>
                <Button onClick={handleCloseClick}>Close</Button>
              </div>

              <div className="flex-1 overflow-auto rounded-lg">
                <Markdown>{session.chat_text}</Markdown>
              </div>
            </div>
          </div>
        )}
        {session.chat_text && session.chat_text.length && (
          <Button variant="secondary" onClick={handleViewClick}>
            View
          </Button>
        )}
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
