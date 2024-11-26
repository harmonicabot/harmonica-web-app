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
import LoadingMessage from 'app/create/loading';
import { sendApiCall } from '@/lib/utils';
import { ApiAction, ApiTarget, OpenAIMessage } from '@/lib/types';
import { VersionedPrompt } from 'app/create/page';

const ChatPopupButton = ({
  prompt,
  handleSetTempAssistantIds,
}: {
  prompt: VersionedPrompt;
  handleSetTempAssistantIds: (value: React.SetStateAction<string[]>) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [assistantId, setAssistantId] = useState('');
  const [entryMessage, setEntryMessage] = useState<OpenAIMessage | null>(null);

  const handleTestVersion = async () => {
    const assistantResponse = await sendApiCall({
      action: ApiAction.CreateAssistant,
      target: ApiTarget.Builder,
      data: {
        prompt: prompt.fullPrompt,
        name: `testing_v${prompt.id}`,
      },
    });

    setAssistantId(assistantResponse.assistantId);
    setEntryMessage({
      role: 'assistant',
      content: `Hello! This is a test session for version ${prompt.id}.\n
I'll run through the session with you so you get an idea how this would work once finalised, 
but bear in mind that I might phrase some things differently depending on our interaction.\n
I won't store any of your replies in this test chat.\n
If you're ready to start:

How should we call you?\n
Please type your name or "anonymous" if you prefer
`,
    });
    // All these temp assistants can be deleted again once the user chooses a final version.
    handleSetTempAssistantIds((prev) => [
      ...prev,
      assistantResponse.assistantId,
    ]);
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
        <div className="h-[60vh]">
          {assistantId && entryMessage ? (
            <Chat entryMessage={entryMessage} assistantId={assistantId} />
          ) : (
            <LoadingMessage />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ChatPopupButton);
