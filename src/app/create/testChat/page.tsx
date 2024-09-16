'use client';

import Chat from "@/components/chat";
import { ApiAction, ApiTarget } from "@/lib/types";
import { sendApiCall } from "@/lib/utils";
import { useEffect, useState } from "react";
import LoadingMessage from "../loading";
import { useSearchParams } from 'next/navigation';

export default function TestChat() {
  const searchParams = useSearchParams();
  const [tempAssistantId, setTempAssistantId] = useState('');

  useEffect(() => {
    console.log('Why is this empty? : ', searchParams);
    const id = searchParams.get('id')
    console.log('Why is this empty? Id:: ', id);
    const promptObject = JSON.parse(localStorage.getItem(id) || '{}');
    console.log('promptObject: ', promptObject);
    if (promptObject.prompt) {
      testVersion(promptObject.prompt, promptObject.version);
    }
  }, [searchParams]);

  const testVersion = async (prompt: string, name: string) => {
    console.log('Initiating new assistant to test a new prompt, version ', name);
    const assistantResponse = await sendApiCall({
      action: ApiAction.CreateAssistant,
      target: ApiTarget.Builder,
      data: {
        prompt: prompt,
        name: `testing_v${name}`,
      },
    });

    setTempAssistantId(assistantResponse.assistantId);
  }


  return (
    <div>
      {tempAssistantId
        ? ( <Chat
            context={`The user wants to test the prompt, please guide them through it.`}
            dontShowFirstMessage={true}
            assistantId={tempAssistantId}
            entryMessage={{
              type: 'ASSISTANT',
              text: `Hi there. Are you ready to start this test-session?`,
            }}
          />
        )
        : (<LoadingMessage />)
      }
    </div>
  );
}