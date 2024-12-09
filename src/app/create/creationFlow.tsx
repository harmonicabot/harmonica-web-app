'use client';

import { useRef, useState } from 'react';
import CreateSession from './create';
import ReviewPrompt from './review';
import LoadingMessage from './loading';
import { ApiAction, ApiTarget, SessionBuilderData } from '@/lib/types';
import { MagicWand } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { sendApiCall } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewHostSession } from '@/lib/schema_updated';
import * as db from '@/lib/db';
import ChooseTemplate from './choose-template';
import { encryptId } from '@/lib/encryptionUtils';

export const maxDuration = 60; // Hosting function timeout, in seconds

// Todo: This class has become unwieldy. Think about splitting more functionality out. (Might not be easy though, because this is the 'coordinator' page that needs to somehow bind together all the functionality of the three sub-steps.)
// One possibility to do that might be to have better state management / a session store or so, into which sub-steps can write to.

export type VersionedPrompt = {
  id: number;
  summary: string;
  fullPrompt: string;
};

const STEPS = ['Template', 'Create', 'Review'] as const;
type Step = (typeof STEPS)[number];
const enabledSteps = [true, false, false];

export default function CreationFlow() {
  const route = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<Step>(STEPS[0]);
  const [threadId, setThreadId] = useState('');
  const [builderAssistantId, setBuilderAssistantId] = useState('');
  const [temporaryAssistantIds, setTemporaryAssistantIds] = useState<string[]>([]);
  const latestFullPromptRef = useRef('');
  const streamingPromptRef = useRef('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [prompts, setPrompts] = useState<VersionedPrompt[]>([]);
  const [currentVersion, setCurrentVersion] = useState(-1);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);

  const addPrompt = (versionedPrompt: VersionedPrompt) => {
    setPrompts((prev) => [...prev, versionedPrompt]);
  };

  // When streaming starts:
  const startStreaming = () => {
    console.log('Streaming started');
    setCurrentVersion(-1);
  };

  // When streaming updates:
  const updateStreaming = (newContent: string) => {
    streamingPromptRef.current = newContent;
  };

  // When streaming completes:
  const completeStreaming = () => {
    console.log('Streaming finished: ', streamingPromptRef);
    const versionedPrompt = {
      id: prompts.length + 1,
      summary: streamingPromptRef.current,
      fullPrompt: latestFullPromptRef.current,
    };
    console.log('Versioned Prompt: ', versionedPrompt);
    setCurrentVersion(versionedPrompt.id);
    addPrompt(versionedPrompt);
    streamingPromptRef.current = '';
  };

  const [formData, setFormData] = useState<SessionBuilderData>({
    sessionName: '',
    goal: '',
    critical: '',
    context: '',
    createSummary: false,
    summaryFeedback: false,
    requireContext: false,
    contextDescription: '',
    enableSkipSteps: false,
  });

  const onFormDataChange = (form: Partial<SessionBuilderData>) => {
    setFormData((prevData) => ({ ...prevData, ...form }));
  };

  const handleCreateComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sessionName?.trim() || !formData.goal?.trim()) {
      setHasValidationErrors(true);
      return;
    }

    if (hasValidationErrors) {
      return;
    }

    setIsLoading(true);
    enabledSteps[1] = true;
    setActiveStep('Review');
    if (prompts.length == 0) {
      await getInitialPrompt();
    } else {
      setIsLoading(false);
    }
  };

  const handleEditPrompt = async (editValue: string) => {
    console.log('Edit instructions: ', editValue);

    // We need to slightly update the edit instructions so that AI knows to apply those changes to the full prompt, not the summary.
    editValue = `Apply the following changes/improvements to the last full template: \n${editValue}`;
    const payload = {
      target: ApiTarget.Builder,
      action: ApiAction.EditPrompt,
      data: {
        threadId: threadId,
        assistantId: builderAssistantId,
        instructions: editValue,
      },
    };

    const newPromptResponse = await sendApiCall(payload);
    latestFullPromptRef.current = newPromptResponse.fullPrompt;

    getStreamOfSummary({
      threadId,
      assistantId: builderAssistantId,
    });
  };

  const handleReviewComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const prompt = prompts[currentVersion - 1].fullPrompt;
    console.log('Creating assistant');
    const assistantResponse = await sendApiCall({
      action: ApiAction.CreateAssistant,
      target: ApiTarget.Builder,
      data: {
        prompt: prompt,
        name: formData.sessionName,
      },
    });

    deleteTemporaryAssistants(temporaryAssistantIds);

    // Create a new session in the host db
    const data: NewHostSession = {
      template: assistantResponse.assistantId,
      topic: formData.sessionName,
      prompt: prompt,
      num_sessions: 0,
      num_finished: 0,
      active: true,
      final_report_sent: false,
      start_time: new Date(),
    };

    db.insertHostSessions(data).then((sessionIds) => {
      const session_id = sessionIds[0];
      // Set the cookie using document.cookie
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // Cookie expires in 30 days
      document.cookie = `sessionId=${session_id}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict`;

      route.push(`/sessions/${encryptId(session_id)}`);
    });
  };

  function deleteTemporaryAssistants(assistantIds: string[]) {
    sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.DeleteAssistants,
      data: {
        assistantIds: assistantIds,
      },
    });
  }

  const stepContent = {
    Template: (
      <div className="max-w-[1080px] mx-auto">
        <ChooseTemplate
          onTemplateSelect={(defaults) => {
            onFormDataChange(defaults);
            enabledSteps[1] = true;
            setActiveStep('Create');
          }}
          onNext={() => setActiveStep('Create')}
        />
      </div>
    ),
    Create: (
      <CreateSession
        onSubmit={handleCreateComplete}
        formData={formData}
        onFormDataChange={onFormDataChange}
        onValidationError={setHasValidationErrors}
      />
    ),
    Review: isLoading ? (
      <LoadingMessage />
    ) : (
      <ReviewPrompt
        prompts={prompts}
        streamingPrompt={streamingPromptRef.current}
        currentVersion={currentVersion}
        setCurrentVersion={setCurrentVersion}
        isEditing={isEditingPrompt}
        handleEdit={handleEditPrompt}
        setTemporaryAssistantIds={setTemporaryAssistantIds}
      />
    ),
  };

  return (
    <div className="min-h-screen pt-16 sm:px-14 pb-16 bg-gray-50 dark:bg-gray-900">
      <div
        className={`mx-auto items-center align-middle ${
          isEditingPrompt ? 'lg:w-4/5' : 'lg:w-2/3'
        }`}
      >
        <div className="flex items-center justify-center mb-6">
          <div className="mr-4">
            <MagicWand />
          </div>
          <h1 className="text-3xl font-bold">New Session</h1>
        </div>

        <Tabs
          value={activeStep}
          onValueChange={(value) => setActiveStep(value as Step)}
        >
          <TabsList className="grid w-fit mx-auto grid-cols-3 gap-4 mb-6">
            {STEPS.map((step, index) => (
              <TabsTrigger
                key={step}
                value={step}
                disabled={!enabledSteps[index]}
              >
                {step}
              </TabsTrigger>
            ))}
          </TabsList>
          {STEPS.map((step) => (
            <TabsContent key={step} value={step}>
              {stepContent[step]}
            </TabsContent>
          ))}
        </Tabs>

        {!isLoading && activeStep !== 'Template' && (
          <div className="flex justify-between items-center pt-4">
            <Button
              className="m-2"
              variant="outline"
              onClick={() =>
                activeStep === 'Create'
                  ? route.push('/')
                  : setActiveStep(STEPS[STEPS.indexOf(activeStep) - 1])
              }
            >
              Back
            </Button>
            <div className="flex space-x-2">
              {activeStep === 'Review' && !isEditingPrompt && (
                <Button
                  className="m-2"
                  onClick={() => setIsEditingPrompt(true)}
                >
                  Edit
                </Button>
              )}
              <Button
                type="submit"
                onClick={
                  activeStep === 'Create'
                    ? handleCreateComplete
                    : handleReviewComplete
                }
                className="m-2"
                disabled={
                  activeStep === 'Create' &&
                  (hasValidationErrors ||
                    !formData.sessionName?.trim() ||
                    !formData.goal?.trim())
                }
              >
                {activeStep === 'Create' ? 'Next' : 'Launch'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  async function getInitialPrompt() {
    // We need to do two API calls here, one to create the main prompt and threadId/assistantId,
    // and one to create the summary. The reason for that is mainly so that we can
    // get the threadId separately from the summary _stream_,
    // SO that we can then use the threadId to edit the prompt.
    // Otherwise we would need to pass the threadId along inside the stream,
    // and parse the stream for it, which is not great.

    const responseFullPrompt = await sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.CreatePrompt,
      data: formData,
    });

    setThreadId(responseFullPrompt.threadId);
    setBuilderAssistantId(responseFullPrompt.assistantId);
    latestFullPromptRef.current = responseFullPrompt.fullPrompt;

    getStreamOfSummary({
      threadId: responseFullPrompt.threadId,
      assistantId: responseFullPrompt.assistantId,
    });
  }

  async function getStreamOfSummary({
    threadId,
    assistantId,
  }: {
    threadId: string;
    assistantId: string;
  }) {
    const response = await sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.EditPrompt,
      stream: true,
      data: {
        threadId: threadId,
        assistantId: assistantId,
        instructions: `
            Summarize the template instructions which you just created in a concise manner and easy to read.
  
            Provide a very brief overview of the structure of this template, the key questions, and about the desired outcome.
  
            Format this in html.
            Example Summary:
  
            <h2 class="text-xl font-bold mb-2">Structure</h2>
            <ul class="list-disc pl-5 mb-4">
              <li>3 short questions to find out xyz</li>
              <li>Relevant follow ups that focus on finding key information</li>
            </ul>
  
            <h2 class="text-xl font-bold mb-2">Questions</h2>
            <ol class="list-decimal pl-5 mb-4">
              <li>[Question1, possibly paraphrased]</li>
              <li>[Question2, possibly paraphrased]</li>
              <li>[QuestionN, possibly paraphrased]</li>
            </ol>
  
            <h2 class="text-xl font-bold mb-2">Outcome</h2>
            <p class="mb-4">
              A list of each participant's <span class="font-semibold">ideas</span> will be collected and <span class="font-semibold">sorted by priority</span>.
              Any <span class="font-semibold">concerns and downsides</span> will be highlighted. This should help to <span class="font-semibold">[achieve goal abc]</span>.
            </p>
            `,
      },
    });

    const reader = response.getReader();
    const decoder = new TextDecoder();

    let message = '';
    setIsLoading(false);
    startStreaming();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      message += chunk;
      // console.log('\nChunk: ', chunk);
      updateStreaming(message);
    }
    completeStreaming();
  }
}
