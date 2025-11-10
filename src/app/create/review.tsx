'use client';

import { SetStateAction, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VersionedPrompt } from './creationFlow';
import { Spinner } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { HRMarkdown } from '@/components/HRMarkdown';
import { Eye, Info } from 'lucide-react';
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
  handleReplaceFullPrompt,
}: {
  prompts: VersionedPrompt[];
  setPrompts: (value: SetStateAction<VersionedPrompt[]>) => void;
  summarizedPrompt: string;
  currentVersion: number;
  setCurrentVersion: (version: number) => void;
  isEditing: boolean;
  handleEdit: (instructions: string) => void;
  handleReplaceFullPrompt: (fullPrompt: string) => void;
}) {
  const [editValue, setEditValue] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showModalState, setShowModalState] = useState(false);
  const [fullPrompt, setFullPrompt] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const onSaveFullPrompt = () => {
    setIsSaving(true);
    handleReplaceFullPrompt(fullPrompt);
  };

  // Close modal when a new summary stream begins (first chunk arrives)
  useEffect(() => {
    if (isSaving && summarizedPrompt && summarizedPrompt.length > 0) {
      setIsSaving(false);
      setShowModalState(false);
    }
  }, [summarizedPrompt, isSaving]);

  return (
    <>
      {showModalState && (
        <div className="fixed inset-0 bg-white backdrop-blur-sm bg-opacity-75 z-50 flex items-center justify-center py-8">
          <div className="bg-white border p-8 rounded-lg w-full max-w-3xl mx-4 md:mx-auto my-6 h-full overflow-y-auto flex flex-col">
            <div className="flex justify-between mb-8">
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold">Interview Guide Prompt</h2>
                <p>This is the guide we share with the AI to conduct the session.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={onSaveFullPrompt} disabled={isSaving} className="border-[1px] flex items-center">
                  {isSaving ? (
                    <>
                      <Spinner />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button variant="secondary" onClick={() => setShowModalState(false)} className="border-[1px]">Close</Button>
              </div>
            </div>

            <Textarea
              name="Full Prompt"
              value={fullPrompt}
              className="w-full flex-1 h-full"
              onChange={(e) => setFullPrompt(e.target.value)}
            />
          </div>
        </div>
      )}
      <div
        id="card-container"
        className="bg-white m-4 overflow-hidden mx-auto p-4 rounded-xl space-y-12 max-w-4xl"
      >
        <div className="lg:flex h-full">
          <div className={`${isEditing ? 'lg:w-2/3' : ''} overflow-auto`}>
            {/* Main title for all generated sessions */}
            <div className="mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <h2 className="text-lg font-semibold text-yellow-800">
                Recommended Structure
              </h2>
            </div>
            <p className="text-muted-foreground">Based on what you shared, we've generated a recommended structure for the session.</p>
            </div>
            {summarizedPrompt ||
              (generating ? (
                <div className="bg-yellow-50 border rounded-xl p-6 my-4">
                  {summarizedPrompt ? (
                    <>
                      <div className="mb-4">
                        <span className="text-sm font-medium">
                          Version {prompts.length + 1}
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
                    ? 'bg-yellow-50 border'
                    : 'bg-white border border-gray-200'
                } rounded-xl p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      prompt.id === currentVersion && !generating ? 'text-yellow-600' : 'text-gray-600'
                    }`}>Version {prompts.length - index}</span>
                  </div>
                  <div className='flex flex-row items-center'>
                  {advancedMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-2"
                      onClick={() => showFullPrompt(prompt.id)}
                      aria-label="View full prompt"
                      title="View full prompt"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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
            {/* Disclaimer moved below cards and above navigation buttons */}
            <div className="inline-flex items-center space-x-2 p-2 bg-yellow-100 border rounded-md w-fit mt-4">
              <Info className="w-4 h-4 text-yellow-600" />
              <p className="text-sm font-medium">
                Collect basic participant info like name and email in the next step
              </p>
            </div>
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
