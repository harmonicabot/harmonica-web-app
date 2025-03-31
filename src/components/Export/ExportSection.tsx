import { HostSession, Message, UserSession } from '@/lib/schema';
import * as db from '@/lib/db';
import { analyzeWithSimScore, extractDataFromUserMessages } from 'app/api/exportUtils';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '../icons';
import { Button } from '../ui/button';
import { usePermissions } from '@/lib/permissions';
import { useCustomResponses } from '../SessionResult/ResultTabs/hooks/useCustomResponses';
import { OpenAIMessage } from '@/lib/types';

// ExportSection.tsx
export default function ExportSection({
  hostData,
  userData,
  id,
  className,
}: {
  hostData: HostSession;
  userData: UserSession[];
  id: string;
  className?: string;
}) {
  const { addResponse } = useCustomResponses(id);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [isExportPopupVisible, setIsExportPopupVisible] = useState(false);
  const [exportInstructions, setExportInstructions] = useState('');

  const exportSessionResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExportPopupVisible(true);
    setExportInProgress(true);

    const response = await extractDataFromUserMessages(userData, exportInstructions);

    const blob = new Blob([JSON.stringify(JSON.parse(response), null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    exportAndDownload(blob, link, `Harmonica_${hostData.topic ?? id}.json`);

    setExportInProgress(false);
    setIsExportPopupVisible(false);
  };  

  const exportAllData = async () => {
    const allMessages = await db.getAllMessagesForUsersSorted(userData);
    const exportData = userData.map((user) => {
      const user_id = user.user_id;
      const user_name = user.user_name;
      const introString = `Use it in communication. Don't ask it again. Start the session.\n`;
      const messagesForOneUser = allMessages.filter(
        (msg) => msg.thread_id === user.thread_id
      );
      if (messagesForOneUser.length === 0) return;
      if (messagesForOneUser[0].content.includes(introString)) {
        messagesForOneUser.shift();
      }
      const chat_text = concatenateMessages(messagesForOneUser);
      return {
        user_id,
        user_name,
        chat_text,
      };
    });
    exportAndDownload(
      new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      }),
      document.createElement('a'),
      `Harmonica_${hostData.topic ?? id}_allData.json`,
    );
    setExportInProgress(false);
    setIsExportPopupVisible(false);
  };

  const handleShowExportPopup = () => {
    setIsExportPopupVisible(true);
  };

  const handleCloseExportPopup = () => {
    setIsExportPopupVisible(false);
  };

  function concatenateMessages(messagesFromOneUser: Message[]) {
    messagesFromOneUser.sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime()
    );
    return messagesFromOneUser
      .map((message) => `${message.role} : ${message.content}`)
      .join('\n');
  }

  function exportAndDownload(
    blob: Blob,
    link: HTMLAnchorElement,
    filename: string,
  ) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const rankWithSimScore = async () => {
    setIsExportPopupVisible(true);
    setExportInProgress(true);
    const sampleObject = [{ author_id: 'user_name', idea: 'idea1' }]
    const adjustedExportInstructions = `${exportInstructions}
\n!IMPORTANT! Use the following JSON schema. 
If specified, group different subject areas and their ideas together.\n
\`\`\`json\n 
${JSON.stringify(sampleObject, null, 2)};
\`\`\`\n
ONLY include plain JSON in your reply, without any backticks, markdown formatting, or explanations!`;
    const extractedData = await extractDataFromUserMessages(userData, adjustedExportInstructions);
    console.log("Extracted Data: ", extractedData)
    const analyzed = await analyzeWithSimScore(extractedData).catch(error => console.log('Sorry, there was an error! ', error));
    console.log('Simscore-analyzed data: ', analyzed);
    
    if (analyzed) {
      // Format the SimScore results as an OpenAIMessage
      const simScoreMessage: OpenAIMessage = {
        role: 'assistant',
        content: `## SimScore Analysis Results\n\n${analyzed}`
      };
      
      // Add to Custom Insights using the hook
      addResponse(simScoreMessage);
    }
    
    setExportInProgress(false);
    setIsExportPopupVisible(false);
    return analyzed;
  }


  const { hasMinimumRole, loading } = usePermissions(id);

  return (
    <>
      <Button className={className} onClick={handleShowExportPopup}>Export Session Details</Button>
      {isExportPopupVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-purple-100 border-purple-200 p-8 rounded-lg w-4/5 md:w-3/5 lg:w-1/2 flex flex-col">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">JSON Export</h2>
              <Button onClick={handleCloseExportPopup} variant="ghost">
                X
              </Button>
            </div>

            <div className="flex-1 overflow-auto rounded-lg">
              <div className="space-y-2">
                <form
                  className="bg-white mx-auto p-10 rounded-xl shadow space-y-4"
                  onSubmit={exportSessionResults}
                >
                  <Label htmlFor="export" size="lg">
                    What would you like to export?
                  </Label>
                  <Textarea
                    name="export"
                    onChange={(e) => setExportInstructions(e.target.value)}
                    placeholder="Export 'names' of participants and their 'opinions'"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter some human-readable instructions, or a JSON scheme.
                  </p>
                  {exportInProgress ? (
                    <>
                      <Spinner />
                      Exporting...
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                        <Button type="submit">Submit</Button>
                        <Button onClick={rankWithSimScore}>Rank with SimScore</Button>
                      {!loading && hasMinimumRole('owner') && <Button onClick={exportAllData} variant="ghost">
                        {' Export All '} 
                        </Button>
                      }
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
