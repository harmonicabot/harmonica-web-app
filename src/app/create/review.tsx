'use client';

import { useEffect, useState } from 'react';
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
import Link from 'next/link';

export default function ReviewPrompt({
  prompts,
  streamingPrompt,
  currentVersion,
  setCurrentVersion,
  isEditing,
  handleEdit,
}: {prompts: VersionedPrompt[], streamingPrompt: string, currentVersion: number, setCurrentVersion: (version: number) => void, isEditing: boolean, handleEdit: (instructions: string) => void}) {
  const [editValue, setEditValue] = useState('');
  const [generating, setGenerating] = useState(false);

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

  const [chatOpen, setChatOpen] = useState(false);
  const [tempAssistantId, setTempAssistant] = useState('');

  const generateRandomId = (length:number) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  const testVersion = (promptId, randomId) => {
    console.log("Using temp id: ", randomId);
    localStorage.setItem(randomId, JSON.stringify({"prompt": prompts[promptId - 1].fullPrompt, "version": promptId}));

    setChatOpen(true);
    return randomId;
  };  

  function showFullPrompt(version: number) {
    // TODO
  }

  console.log(`#Prompts: ${prompts.length}, CurrentVersion: ${currentVersion}`, prompts);

  return (
    <>
      <div
        id="card-container"
        className="bg-white w-full mx-auto p-4 m-4 h-[calc(100vh-200px)] overflow-hidden">
        <div className="lg:flex h-full">
          <div className={`${isEditing ? 'lg:w-2/3' : ''} overflow-scroll`}>
            {streamingPrompt || generating && (
              <Card className={`p-6 bg-purple-50 my-4`}>
                {streamingPrompt ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">v{prompts.length + 1}</h2>
                    </div>
                    <div dangerouslySetInnerHTML={sanitizeHtml(streamingPrompt)} />
                  </>
                ) : (
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Generating...</h2>
                    <Spinner/>
                  </div>
                )}
              </Card>
            )}
            {prompts.toReversed().map((prompt, index) => {
              const randomId = generateRandomId(6);
    
              return (
                <Card
                  key={prompt.id}
                  className={`p-6 my-4 ${(prompt.id === currentVersion && !generating) ? 'bg-purple-100' : 'bg-white'
                    }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <Badge variant='outline'>v{prompts.length - index}</Badge>
                    <div>
                      {/* <Button
                      variant="secondary"
                      className="ml-2"
                      size='sm'
                      onClick={() => {showFullPrompt(prompt.id)}}
                      >
                        <Eye/>
                    </Button> */}
                                    
                    
                      <Button
                        variant="outline"
                        className='mr-2'
                        onClick={() => testVersion(prompt.id, randomId)}
                      >
                        <Link target='_blank' href={`./testChat?id=${randomId}`}>
                          Test
                        </Link>
                      </Button>
                      {prompt.id !== currentVersion ? (
                        <Button
                          onClick={() => setCurrentVersion(prompt.id)}
                        >
                          Select
                        </Button>
                      ) : (
                        <Button disabled>
                          Selected
                        </Button>
                      )}
                    </div>
                  </div>
                  <div dangerouslySetInnerHTML={sanitizeHtml(prompt.summary)} />
                </Card>
              );
            })}
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
                <Button onClick={handleSubmit}>{generating ? 'Generating' : 'Submit'}</Button>
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
