'use client';

import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VersionedPrompt } from './page';

export default function ReviewPrompt({
  prompts,
  streamingPrompt,
  currentVersion,
  setCurrentVersion,
  isEditing,
  handleEdit,
}: {prompts: VersionedPrompt[], streamingPrompt: string, currentVersion: number, setCurrentVersion: (version: number) => void, isEditing: boolean, handleEdit: (instructions: string) => void}) {
  const [editValue, setEditValue] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

  console.log(`#Prompts: ${prompts.length}, CurrentVersion: ${currentVersion}`, prompts);

  return (
    <>
      <div
        id="card-container"
        className="bg-white w-full mx-auto p-4 m-4 h-[calc(100vh-200px)] overflow-hidden">
        <div className="lg:flex h-full">
          <div className={`${isEditing ? 'lg:w-2/3' : ''} overflow-scroll`}>
            {streamingPrompt && (
              <Card className={`p-6 bg-purple-100 my-4`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">v{prompts.length + 1}</h2>
                </div>
                <div dangerouslySetInnerHTML={sanitizeHtml(streamingPrompt)} />
              </Card>
            )}
            {prompts.toReversed().map((prompt, index) => (
              <Card
                key={prompt.id}
                className={`p-6 my-4 ${
                  prompt.id === currentVersion ? 'bg-purple-100' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">v{prompts.length - index}</h2>
                  {prompt.id !== currentVersion && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentVersion(prompt.id)}
                    >
                      Select
                    </Button>
                  )}
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
                <Button onClick={() => handleEdit(editValue)}>Submit</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
