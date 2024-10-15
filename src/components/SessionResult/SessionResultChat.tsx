import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Chat from '@/components/chat';

interface UserData {
  chat_text: string;
}

interface SessionResultChatProps {
  userData: UserData[];
}

export default function SessionResultChat({ userData }: SessionResultChatProps) {
  return (
    <Card className="bg-purple-100 border-purple-200 h-auto">
      <CardHeader>
        <CardTitle className="text-md">Ask Monica</CardTitle>
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
            `,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}