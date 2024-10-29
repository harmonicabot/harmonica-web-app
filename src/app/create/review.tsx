'use client';

import { SetStateAction, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VersionedPrompt } from './page';
import { Spinner } from '@/components/icons';
import { sendApiCall } from '@/lib/utils';
import { ApiAction, ApiTarget } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import Markdown from 'react-markdown';
import ChatPopupButton from '@/components/ChatPopupButton';

export default function ReviewPrompt({
  prompts,
  streamingPrompt,
  currentVersion,
  setCurrentVersion,
  isEditing,
  handleEdit,
  setTemporaryAssistantIds,
}: {
  prompts: VersionedPrompt[];
  streamingPrompt: string;
  currentVersion: number;
  setCurrentVersion: (version: number) => void;
  isEditing: boolean;
  handleEdit: (instructions: string) => void;
  setTemporaryAssistantIds: (value: SetStateAction<string[]>) => void;
}) {
  const [editValue, setEditValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [modalState, setModalState] = useState({ open: false, text: '' });

  const handleSubmit = async () => {
    setGenerating(true);
    handleEdit(editValue);
  };

  useEffect(() => {
    setGenerating(false);
  }, [streamingPrompt, prompts]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    console.log(e.currentTarget.value);
    setEditValue(e.currentTarget.value);
  };

  function sanitizeHtml(html: string) {
    // Sometimes the string will start with a 'code-block indicator'
    const cleaned = html.replace(/^```html|```$/g, '');
    return {
      __html: DOMPurify.sanitize(cleaned),
    };
  }

  const [tempAssistantId, setTempAssistant] = useState('');

  const showFullPrompt = (promptId: number) => {
    setModalState({ open: true, text: prompts[promptId - 1].fullPrompt });
  };

  console.log(
    `#Prompts: ${prompts.length}, CurrentVersion: ${currentVersion}`,
    prompts,
  );

  return (
    <>
      {modalState.open && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-full h-full overflow-auto">
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold mb-4">Full Prompt</h2>
              <Button onClick={() => setModalState({ open: false, text: '' })}>
                Close
              </Button>
            </div>

            <>
              <Markdown>{modalState.text}</Markdown>
            </>
          </div>
        </div>
      )}
      <div
        id="card-container"
        className="bg-white m-4 h-[calc(100vh-200px)] overflow-hidden mx-auto p-4 rounded-xl shadow space-y-12"
      >
        <div className="lg:flex h-full">
          <div className={`${isEditing ? 'lg:w-2/3' : ''} overflow-scroll`}>
            {streamingPrompt ||
              (generating && (
                <Card className={`p-6 bg-purple-50 my-4`}>
                  {streamingPrompt ? (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">
                          v{prompts.length + 1}
                        </h2>
                      </div>
                      <div
                        dangerouslySetInnerHTML={sanitizeHtml(streamingPrompt)}
                      />
                    </>
                  ) : (
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">Generating...</h2>
                      <Spinner />
                    </div>
                  )}
                </Card>
              ))}
            {prompts.toReversed().map((prompt, index) => (
              <Card
                key={prompt.id}
                className={`p-6 my-4 ${
                  prompt.id === currentVersion && !generating
                    ? 'bg-purple-100'
                    : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <Badge variant="outline">v{prompts.length - index}</Badge>
                  <div>
                    {/* <Button
                    variant="secondary"
                    className="ml-2"
                    size='sm'
                    onClick={() => {showFullPrompt(prompt.id)}}
                    >
                      <Eye/>
                  </Button> */}
                    {/* <Button
                      variant="outline"
                      onClick={() => showFullPrompt(prompt.id)}
                      className="mr-2"
                    >
                      Full Prompt
                    </Button> */}
                    <ChatPopupButton prompt={prompt} handleSetTempAssistantIds={setTemporaryAssistantIds} />
                    {prompt.id !== currentVersion ? (
                      <Button onClick={() => setCurrentVersion(prompt.id)}>
                        Select
                      </Button>
                    ) : (
                      <Button disabled>Selected</Button>
                    )}
                  </div>
                </div>
                <div dangerouslySetInnerHTML={sanitizeHtml(prompt.summary)} />
              </Card>
            ))}
          </div>
          <div className={`${isEditing ? 'lg:w-1/3 m-4' : ''}`}>
            {isEditing && (
              <>
                <div className="flex mb-2">
                  <Textarea
                    name="Edit instructions"
                    value={editValue}
                    onChange={handleInputChange}
                    placeholder="What would you like to change?"
                    className="flex-grow"
                  />
                </div>
                <Button onClick={handleSubmit}>
                  {generating ? 'Generating' : 'Submit'}
                </Button>
              </>
            )}
            {/* {chatOpen && (
              <ChatComponent
                entryMessage={{ type: 'user', text: `Hello! Do you want to try how this structure works?`}}
                assistantId={tempAssistantId}
              />
            )} */}
          </div>
        </div>
      </div>
    </>
  );
}
