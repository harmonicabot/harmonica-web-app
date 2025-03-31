import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Chat from '@/components/chat';
import { VersionedPrompt } from 'app/create/creationFlow';
import { OpenAIMessage } from '@/lib/types';

const ChatPopupButton = ({
  prompt,
}: {
  prompt: VersionedPrompt;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const entryMessage: OpenAIMessage = {
      role: 'assistant',
      content: `Hello! This is a test session for version ${prompt.id}.\n
I'll run through the session with you so you get an idea how this would work once finalised, 
but bear in mind that I might phrase some things differently depending on our interaction.\n
I won't store any of your replies in this test chat.\n
If you're ready to start:

How should we call you?\n
Please type your name or "anonymous" if you prefer
`}
  
  const handleTestVersion = () => {
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mr-2" onClick={handleTestVersion}>
          Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[700px] lg:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Test</DialogTitle>
        </DialogHeader>
        <div>
          <Chat entryMessage={entryMessage} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ChatPopupButton);
