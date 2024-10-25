import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Chat from '@/components/chat';
import { UserSessionData } from "@/lib/types";

export default function SessionResultChat({ userData }: { userData: UserSessionData[] }) {
  return (
    <Card className="h-auto border-yellow-400">
      <CardHeader className="bg-yellow-50 border-gray-200 rounded-md">
        <CardTitle className="text-md flex justify-normal items-center">
          <img src="/monica_chat_icon.svg" alt="" className="h-10 w-10 mr-2" />Ask AI
        </CardTitle>
      </CardHeader>
      <CardContent className="h-auto">
        {userData && userData.length > 0 && (
          <Chat
            userNameInFirstMessage={false}
            context={{
              role: 'assistant',
              content: `You will be asked questions based on the session data. Answer short. The context of the session is: ${userData.map((user) => user.chat_text).join(' --- next USER ---')}

             ------------`,
            }}
            assistantId="asst_LQospxVfX4vMTONASzSkSUwb"
            entryMessage={{
              type: 'ASSISTANT',
              text: `Hi there! Consider me your expert analyst, I can help you to better understand your session.

Here are a few examples of what you can ask me:
  - What was the most common response?
  - What were the most interesting insights?
  - Generate a report on the session
            `
          }}
          placeholderText="What would you like to know?"
          />
        )}
      </CardContent>
    </Card>
  );
}