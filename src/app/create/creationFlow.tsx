'use client';

import { useRef, useState } from 'react';
import CreateSession from './create';
import ReviewPrompt from './review';
import LoadingMessage from './loading';
import { ApiAction, ApiTarget, SessionBuilderData } from '@/lib/types';
import { sendApiCall } from '@/lib/clientUtils';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewHostSession } from '@/lib/schema';
import * as db from '@/lib/db';
import ChooseTemplate from './choose-template';
import { encryptId } from '@/lib/encryptionUtils';

import ShareParticipants from './ShareParticipants';
import { QuestionInfo } from './types';
import { StepHeader } from './StepHeader';
import { StepNavigation } from './StepNavigation';
import { LaunchModal } from './LaunchModal';
import { Step, STEPS } from './types';
import { createPromptContent } from 'app/api/utils';

export const maxDuration = 60; // Hosting function timeout, in seconds

// Todo: This class has become unwieldy. Think about splitting more functionality out. (Might not be easy though, because this is the 'coordinator' page that needs to somehow bind together all the functionality of the three sub-steps.)
// One possibility to do that might be to have better state management / a session store or so, into which sub-steps can write to.

export type VersionedPrompt = {
  id: number;
  summary: string;
  fullPrompt: string;
};

const enabledSteps = [true, false, false];

type StepConfig = {
  id: string;
  value: Step;
  label: string;
};

const STEP_CONFIG: StepConfig[] = [
  { id: 'template', value: 'Template', label: 'Define Objective' },
  { id: 'create', value: 'Create', label: 'Add Context' },
  { id: 'refine', value: 'Refine', label: 'Refine Agenda' },
  { id: 'share', value: 'Share', label: 'Set Data Form' },
];

export default function CreationFlow() {
  const route = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<Step>(STEPS[0]);
  const [threadId, setThreadId] = useState('');
  const [builderAssistantId, setBuilderAssistantId] = useState('');
  const [temporaryAssistantIds, setTemporaryAssistantIds] = useState<string[]>(
    [],
  );
  const latestFullPromptRef = useRef('');
  const streamingPromptRef = useRef('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [prompts, setPrompts] = useState<VersionedPrompt[]>([]);
  const [currentVersion, setCurrentVersion] = useState(-1);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [participantQuestions, setParticipantQuestions] = useState<
    QuestionInfo[]
  >([]);
  const [, setThrowError] = useState(); // This can be used to throw errors from async functions that react will handle in the

  const [
    createNewPromptBecauseCreationContentChanged,
    setCreateNewPromptBecauseCreationContentChanged,
  ] = useState(false);

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
  });

  const [templateId, setTemplateId] = useState<string | undefined>();

  const onFormDataChange = (form: Partial<SessionBuilderData>) => {
    setFormData((prevData) => ({ ...prevData, ...form }));
    if (prompts.length > 0) {
      setCreateNewPromptBecauseCreationContentChanged(true);
    }
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
    setActiveStep('Refine');
    try {
      if (prompts.length == 0) {
        await getInitialPrompt();
      } else if (createNewPromptBecauseCreationContentChanged) {
        await handleCreatePrompt();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setThrowError(() => {
        throw error;
      });
    }
  };

  const handleEditPrompt = async (editValue: string) => {
    console.log('[i] Edit instructions: ', editValue);

    // We need to slightly update the edit instructions so that AI knows to apply those changes to the full prompt, not the summary.
    editValue = `Apply the following changes/improvements to the last full template: \n${editValue}`;
    const payload = {
      target: ApiTarget.Builder,
      action: ApiAction.EditPrompt,
      data: {
        fullPrompt: latestFullPromptRef.current,
        instructions: editValue,
      },
    };

    try {
      const newPromptResponse = await sendApiCall(payload);
      latestFullPromptRef.current = newPromptResponse.fullPrompt;

      getStreamOfSummary({
        fullPrompt: newPromptResponse.fullPrompt,
      });
    } catch (error) {
      setThrowError(() => {
        throw error;
      });
    }
  };

  const handleShareComplete = async (
    e: React.FormEvent,
    mode: 'launch' | 'draft' = 'launch',
  ) => {
    e.preventDefault();
    setIsLoading(true);
    const currentPrompt = prompts[currentVersion - 1];
    const prompt = currentPrompt.fullPrompt;
    const promptSummary = currentPrompt.summary;

    try {
      const data: NewHostSession = {
        assistant_id: '',
        template_id: templateId,
        topic: formData.sessionName,
        prompt: prompt,
        num_sessions: 0,
        num_finished: 0,
        active: mode === 'launch', // Set active based on mode
        final_report_sent: false,
        start_time: new Date(),
        goal: formData.goal,
        critical: formData.critical,
        context: formData.context,
        prompt_summary: promptSummary,
        is_public: false,
        summary_assistant_id: '',
        questions: JSON.stringify(
          participantQuestions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            typeValue: q.typeValue,
            required: q.required,
            options: q.options,
          })),
        ) as unknown as JSON,
      };

      const sessionIds = await db.insertHostSessions(data);
      const sessionId = sessionIds[0];
      await db.setPermission(sessionId, 'owner');

      // Set cookie
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      document.cookie = `sessionId=${sessionId}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict`;

      // Navigate based on mode
      if (mode === 'launch') {
        route.push(`/sessions/${encryptId(sessionId)}`);
      } else {
        route.push('/');
      }
    } catch (error) {
      setThrowError(() => {
        throw error;
      });
    }
  };

  const handleReviewComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveStep('Share');
  };

  const stepContent = {
    Template: (
      <div className="max-w-[1080px] mx-auto">
        <ChooseTemplate
          onTemplateSelect={(
            formDataDefaults: Partial<SessionBuilderData>,
            templateId?: string,
          ) => {
            onFormDataChange(formDataDefaults);
            setTemplateId(templateId);
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
    Refine: isLoading ? (
      <LoadingMessage />
    ) : (
      <ReviewPrompt
        prompts={prompts}
        setPrompts={setPrompts}
        streamingPrompt={streamingPromptRef.current}
        currentVersion={currentVersion}
        setCurrentVersion={setCurrentVersion}
        isEditing={isEditingPrompt}
        handleEdit={handleEditPrompt}
        setTemporaryAssistantIds={setTemporaryAssistantIds}
      />
    ),
    Share: !isLoading && activeStep === 'Share' && (
      <div className="max-w-[540px] mx-auto">
        <ShareParticipants onQuestionsUpdate={setParticipantQuestions} />
      </div>
    ),
  };

  return (
    <div className="min-h-screen pt-16 sm:px-14 pb-16 bg-gray-50 dark:bg-gray-900">
      <div
        className={`mx-auto items-center align-middle ${
          isEditingPrompt ? 'lg:w-4/5' : 'lg:w-2/3'
        }`}
      >
        <StepHeader />

        <Tabs
          value={activeStep}
          onValueChange={(value) => setActiveStep(value as Step)}
        >
          <TabsList className="grid w-fit mx-auto grid-cols-4 gap-4 mb-6">
            {STEP_CONFIG.map((step, index) => (
              <TabsTrigger
                key={step.id}
                value={step.value}
                disabled={!enabledSteps[index]}
              >
                {step.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {STEP_CONFIG.map((step) => (
            <TabsContent key={step.id} value={step.value}>
              {stepContent[step.value]}
            </TabsContent>
          ))}
        </Tabs>

        <StepNavigation
          activeStep={activeStep}
          isLoading={isLoading}
          isEditingPrompt={isEditingPrompt}
          hasValidationErrors={hasValidationErrors}
          formData={formData}
          setIsEditingPrompt={setIsEditingPrompt}
          handleBack={() =>
            activeStep === 'Create'
              ? route.push('/')
              : setActiveStep(STEPS[STEPS.indexOf(activeStep) - 1])
          }
          handleNext={
            activeStep === 'Create'
              ? handleCreateComplete
              : activeStep === 'Share'
                ? (e) => {
                    e.preventDefault();
                    setShowLaunchModal(true);
                  }
                : handleReviewComplete
          }
          nextLabel={activeStep === 'Share' ? 'Launch' : undefined}
        />

        {showLaunchModal && (
          <LaunchModal
            showLaunchModal={showLaunchModal}
            setShowLaunchModal={setShowLaunchModal}
            handleShareComplete={handleShareComplete}
          />
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
      fullPrompt: responseFullPrompt.fullPrompt,
    });
  }

  async function handleCreatePrompt() {
    const promptInstructions = createPromptContent(formData);
    // We need to slightly update the instructions so that AI knows to create a new full prompt, not to base it on what was there before.
    const newPromptInstructions = `Create a new prompt based on the following instructions: \n${promptInstructions}`;
    const payload = {
      target: ApiTarget.Builder,
      action: ApiAction.EditPrompt,
      data: {
        threadId: threadId,
        assistantId: builderAssistantId,
        instructions: newPromptInstructions,
      },
    };

    const newPromptResponse = await sendApiCall(payload);
    latestFullPromptRef.current = newPromptResponse.fullPrompt;

    getStreamOfSummary({
      fullPrompt: newPromptResponse.fullPrompt,
    });
  }

  async function getStreamOfSummary({ fullPrompt }: { fullPrompt: string }) {
    const response = await sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.SummaryOfPrompt,
      stream: true,
      data: {
        fullPrompt: fullPrompt,
        instructions: `
Summarize the template instructions which you just created in a concise manner and easy to read.

Provide a very brief overview of the structure of this template, the key questions, and about the desired outcome.

Format this in Markdown.
Example Summary:

## Structure
* 3 short questions to find out xyz
* Relevant follow ups that focus on finding key information
## Questions
1. [Question1, possibly paraphrased]
2. [Question2, possibly paraphrased]
N. [QuestionN, possibly paraphrased]

## Outcome
A list of each participant's **ideas** will be collected and **sorted by priority**.
Any **concerns and downsides** will be highlighted. This should help to **[achieve session_objective]**.
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
