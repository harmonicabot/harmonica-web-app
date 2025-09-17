'use client';

import { SetStateAction, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VersionedPrompt } from './creationFlow';
import { Spinner } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { HRMarkdown } from '@/components/HRMarkdown';
import { Eye } from 'lucide-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/serverUtils';

export default function ReviewPrompt({
  prompts,
  setPrompts,
  summarizedPrompt,
  currentVersion,
  setCurrentVersion,
  isEditing,
  handleEdit,
}: {
  prompts: VersionedPrompt[];
  setPrompts: (value: SetStateAction<VersionedPrompt[]>) => void;
  summarizedPrompt: string;
  currentVersion: number;
  setCurrentVersion: (version: number) => void;
  isEditing: boolean;
  handleEdit: (instructions: string) => void;
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
  }, [summarizedPrompt, prompts]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditValue(e.currentTarget.value);
  };

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
      return [...prev];
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
              <Button onClick={() => closeAndUpdateFullPrompt(1)}>Close</Button>
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
        className="bg-white m-4 overflow-hidden mx-auto p-4 rounded-xl shadow space-y-12 max-w-4xl"
      >
        <div className="lg:flex h-full">
          <div className={`${isEditing ? 'lg:w-2/3' : ''} overflow-auto`}>
            {/* Main title for all generated sessions */}
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <h2 className="text-lg font-semibold text-yellow-800">
                Your Generated Session
              </h2>
            </div>
            {summarizedPrompt ||
              (generating ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 my-4">
                  {summarizedPrompt ? (
                    <>
                      <div className="mb-4">
                        <span className="text-sm text-yellow-600 font-medium">
                          v{prompts.length + 1}
                        </span>
                      </div>
                      <div className="p-4">
                        <HRMarkdown content={summarizedPrompt} />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-sm text-yellow-600 font-medium">
                        Generating...
                      </span>
                      <Spinner />
                    </div>
                  )}
                </div>
              ) : (
                summarizedPrompt.length > 0 && (
                  <Card className={`p-6 bg-yellow-50 my-4`}>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">
                        <Badge variant="outline">v{prompts.length + 1}</Badge>
                      </h2>
                    </div>
                    <div>
                      <HRMarkdown content={summarizedPrompt} />
                    </div>
                  </Card>
                )
              ))}
            {prompts.toReversed().map((prompt, index) => (
              <div
                key={prompt.id}
                className={`my-4 ${
                  prompt.id === currentVersion && !generating
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-white border border-gray-200'
                } rounded-xl p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      prompt.id === currentVersion && !generating ? 'text-yellow-600' : 'text-gray-600'
                    }`}>v{prompts.length - index}</span>
                  </div>
                  <div className='flex flex-row items-center'>
                    {advancedMode && (
                      <Eye
                        className="mr-2"
                        onClick={() => showFullPrompt(prompt.id)}
                      />
                    )}
                    {/* Disabling the 'Test' chat, it doesn't work because we don't have the session ID yet, but it's needed for the AI to use the actual prompt...
                    <ChatPopupButton
                      prompt={prompt}
                    /> */}
                    {prompt.id !== currentVersion ? (
                      <Button
                        className="border-[1px]"
                        onClick={() => setCurrentVersion(prompt.id)}
                      >
                        Select
                      </Button>
                    ) : (
                      <Button className="border-[1px]" disabled>
                        Selected
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <HRMarkdown content={prompt.summary} />
                </div>
              </div>
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
          </div>
        </div>
      </div>
    </>
  );
}
