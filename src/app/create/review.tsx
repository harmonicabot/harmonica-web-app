'use client';

import { SetStateAction, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VersionedPrompt } from './creationFlow';
import { Spinner } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import ChatPopupButton from '@/components/ChatPopupButton';
import { HRMarkdown } from '@/components/HRMarkdown';
import { Eye } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/serverUtils';

export default function ReviewPrompt({
  prompts,
  setPrompts,
  streamingPrompt,
  currentVersion,
  setCurrentVersion,
  isEditing,
  handleEdit,
  setTemporaryAssistantIds,
}: {
  prompts: VersionedPrompt[];
  setPrompts: (value: SetStateAction<VersionedPrompt[]>) => void;
  streamingPrompt: string;
  currentVersion: number;
  setCurrentVersion: (version: number) => void;
  isEditing: boolean;
  handleEdit: (instructions: string) => void;
  setTemporaryAssistantIds: (value: SetStateAction<string[]>) => void;
}) {
  const [editValue, setEditValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showModalState, setShowModalState] = useState(false);
  const [fullPrompt, setFullPrompt] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);

  const user = useUser().user;

  useEffect(() => {
    
    if (user) {
      isAdmin(user).then(setAdvancedMode);
    }
  }, []);
  console.log('Advanced mode: ', advancedMode);


  const handleSubmit = async () => {
    setGenerating(true);
    handleEdit(editValue);
  };

  useEffect(() => {
    setGenerating(false);
  }, [streamingPrompt, prompts]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditValue(e.currentTarget.value);
  };

  function sanitizeHtml(html: string) {
    // Sometimes the string will start with a 'code-block indicator'
    const cleaned = html.replace(/^```html|```$/g, '');
    return {
      __html: DOMPurify.sanitize(cleaned),
    };
  }

  const showFullPrompt = (promptId: number) => {
    setShowModalState(true);
    setFullPrompt(prompts[promptId - 1].fullPrompt);
  };

  const closeAndUpdateFullPrompt = (promptId: number) => {
    const updatedPrompt = prompts[promptId - 1];
    updatedPrompt.fullPrompt = fullPrompt;
    updatedPrompt.summary = fullPrompt;
    setPrompts((prev) => {
      prev[promptId - 1] = updatedPrompt;
      console.log('Updated prompts: ', prev);
      return [...prev] 
    });
    setShowModalState(false);
  };

  return (
    <>
      {showModalState && (
        <div className="fixed inset-0 bg-black bg-opacity-75 items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-full h-svh overflow-auto flex flex-col">
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold mb-4">Full Prompt</h2>
              <Button onClick={() => closeAndUpdateFullPrompt(1)}>
                Close
              </Button>
            </div>

            <Textarea
              name="Full Prompt"
              value={fullPrompt}
              className="w-full flex-1"
              onChange={(e) => setFullPrompt(e.target.value)}
            />
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
                      <div>
                        <HRMarkdown content={streamingPrompt} />
                      </div>
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
                  <div className='flex flex-row items-center'>
                    {advancedMode && (
                      <Eye 
                        className="mr-2"
                        onClick={() => showFullPrompt(prompt.id)}
                      />
                    )}
                    <ChatPopupButton
                      prompt={prompt}
                      handleSetTempAssistantIds={setTemporaryAssistantIds}
                    />
                    {prompt.id !== currentVersion ? (
                      <Button className='border-[1px]' onClick={() => setCurrentVersion(prompt.id)}>
                        Select
                      </Button>
                    ) : (
                      <Button className='border-[1px]' disabled>Selected</Button>
                    )}
                  </div>
                </div>
                <div>
                  <HRMarkdown content={prompt.summary} />
                </div>
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
