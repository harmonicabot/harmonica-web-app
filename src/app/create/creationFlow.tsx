'use client';

import { useRef, useState, useEffect } from 'react';
import MultiStepForm from './MultiStepForm';
import ReviewPrompt from './review';
import LoadingMessage from './loading';
import { ApiAction, ApiTarget, SessionBuilderData } from '@/lib/types';
import { sendApiCall } from '@/lib/clientUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import { NewHostSession } from '@/lib/schema';
import * as db from '@/lib/db';
import ChooseTemplate from './choose-template';
import { encryptId } from '@/lib/encryptionUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import ShareParticipants from './ShareParticipants';
import { QuestionInfo } from './types';
import { StepHeader } from './StepHeader';
import { LaunchModal } from './LaunchModal';
import { Step, STEPS } from './types';
import { createPromptContent } from 'app/api/utils';
import { getPromptInstructions } from '@/lib/promptActions';
import { linkSessionsToWorkspace } from '@/lib/workspaceActions';

export const maxDuration = 60; // Hosting function timeout, in seconds

// Todo: This class has become unwieldy. Think about splitting more functionality out. (Might not be easy though, because this is the 'coordinator' page that needs to somehow bind together all the functionality of the three sub-steps.)
// One possibility to do that might be to have better state management / a session store or so, into which sub-steps can write to.

export type VersionedPrompt = {
  id: number;
  summary: string;
  fullPrompt: string;
};

const enabledSteps = [true, false, false];

export default function CreationFlow() {
  const route = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<Step>(STEPS[1]); // Start with 'Create' (multi-step form)
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

  // Handle session storage pre-fill data
  useEffect(() => {
    const prefillData = sessionStorage.getItem('createSessionPrefill');
    if (prefillData) {
      try {
        const data = JSON.parse(prefillData);
        // Only use if less than 5 minutes old
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          onFormDataChange(data);
          enabledSteps[1] = true;
          setActiveStep('Create');
        }
        // Always clear the data
        sessionStorage.removeItem('createSessionPrefill');
      } catch (error) {
        console.error('Error parsing prefill data:', error);
        sessionStorage.removeItem('createSessionPrefill');
      }
    }
  }, []);

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
    editValue = `You are editing a session facilitation prompt. Apply ONLY the following specific changes to the existing prompt structure:

${editValue}

IMPORTANT: 
- Return ONLY the updated prompt content
- Do NOT include explanations, commentary, or meta-text
- Maintain the exact same format and structure
- Focus only on the requested changes`;
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
        cross_pollination: true, // Default to true since we removed the toggle
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

      // Navigate based on mode & whether there's a workspace to link to
      const workspaceId = searchParams.get('workspaceId');
      
      if (workspaceId) {
        try {
          // Link the newly created session to the workspace
          await linkSessionsToWorkspace(workspaceId, [sessionId]);
          // Redirect to the workspace page
          route.push(`/workspace/${workspaceId}`);
        } catch (error) {
          console.error('Failed to link session to workspace:', error);
        }
      } else if (mode === 'launch') {
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
      <MultiStepForm
        onSubmit={handleCreateComplete}
        formData={formData}
        onFormDataChange={onFormDataChange}
        onValidationError={setHasValidationErrors}
        isLoading={isLoading}
        onBackToDashboard={() => route.push('/')}
      />
    ),
    Refine: isLoading ? (
      <LoadingMessage />
    ) : (
      <ReviewPrompt
        prompts={prompts}
        setPrompts={setPrompts}
        summarizedPrompt={streamingPromptRef.current}
        currentVersion={currentVersion}
        setCurrentVersion={setCurrentVersion}
        isEditing={isEditingPrompt}
        handleEdit={handleEditPrompt}
      />
    ),
    Share: !isLoading && activeStep === 'Share' && (
      <ShareParticipants 
        onQuestionsUpdate={setParticipantQuestions} 
        sessionPreview={prompts[currentVersion - 1]?.summary}
      />
    ),
  };

  return (
    <div className="min-h-screen pt-16 sm:px-14 pb-16 bg-white dark:bg-gray-900">
      <StepHeader />

      <div className="w-full">
        {stepContent[activeStep]}
      </div>

      {/* Navigation for non-Create and non-Template steps, but not during loading */}
      {activeStep !== 'Create' && activeStep !== 'Template' && !isLoading && (
        <div
          className={`mx-auto items-center align-middle ${
            isEditingPrompt ? 'lg:w-4/5' : 'lg:w-2/3'
          }`}
        >
          <div className="flex justify-between items-center mt-8 max-w-lg mx-auto">
            {/* Back button on the left */}
            <button
              type="button"
              onClick={() => setActiveStep(STEPS[STEPS.indexOf(activeStep) - 1])}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            
            {/* Edit and Next buttons grouped on the right */}
            <div className="flex gap-4">
              {/* Edit button for Refine step */}
              {activeStep === 'Refine' && (
                <button
                  type="button"
                  onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {isEditingPrompt ? 'Done Editing' : 'Edit'}
                </button>
              )}
              
              <button
                type="button"
                onClick={
                  activeStep === 'Share'
                    ? () => setShowLaunchModal(true)
                    : handleReviewComplete
                }
                disabled={isLoading}
                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? 'Loading...' : activeStep === 'Share' ? 'Launch' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showLaunchModal && (
        <LaunchModal
          showLaunchModal={showLaunchModal}
          setShowLaunchModal={setShowLaunchModal}
          handleShareComplete={handleShareComplete}
        />
      )}
    </div>
  );

  async function getInitialPrompt() {
    const responseFullPrompt = await sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.CreatePrompt,
      data: formData,
    });
    latestFullPromptRef.current = responseFullPrompt.fullPrompt;

    // This will stream directly into the streamPromptRef:
    // TODO: Streaming doesn't work yet
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
        fullPrompt: latestFullPromptRef.current,
        instructions: newPromptInstructions,
      },
    };

    const newPromptResponse = await sendApiCall(payload);
    latestFullPromptRef.current = newPromptResponse.fullPrompt;
    console.log('[i] New prompt response: ', newPromptResponse.fullPrompt);

    getStreamOfSummary({
      fullPrompt: newPromptResponse.fullPrompt,
    });
  }

  async function getStreamOfSummary({ fullPrompt }: { fullPrompt: string }) {
    const sessionRecapPrompt = await getPromptInstructions('SESSION_RECAP');

    const response = await sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.SummaryOfPrompt,
      stream: true,
      data: {
        fullPrompt: fullPrompt,
        instructions: sessionRecapPrompt,
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
      console.log(
        `[i] Chunk: ${JSON.stringify(chunk)}; Initial Value: ${JSON.stringify(value)}`,
      );
      message += chunk;
      // console.log('\nChunk: ', chunk);
      updateStreaming(message);
    }
    completeStreaming();
  }
}
