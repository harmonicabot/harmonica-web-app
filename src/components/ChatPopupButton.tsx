import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Chat from '@/components/chat';

const ChatPopupButton = ({ assistantId }: { assistantId: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mr-2">
          Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px] lg:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Test</DialogTitle>
        </DialogHeader>
        <div className="h-[60vh]">
          <Chat
            entryMessage={{
              type: 'ASSISTANT',
              text: `Nice to meet you! Could you please let me know your name?`,
            }}
            assistantId={assistantId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ChatPopupButton);
