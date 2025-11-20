'use client';

// Session Overview Modal Component
import React, { useState, useEffect, SetStateAction } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { sendApiCall } from '@/lib/clientUtils';
import { ApiAction, ApiTarget } from '@/lib/types';
import { VersionedPrompt } from 'app/create/creationFlow';
import { getPromptInstructions } from '@/lib/promptActions';
import { QuestionInfo } from 'app/create/types';
import { FormBuilder } from './FormBuilder';
import { SessionDetailsTab } from './SessionDetailsTab';
import { SessionDetailsActionBar } from './SessionDetailsActionBar';
import { EditSessionTab } from './EditSessionTab';
import { SidebarNavigation } from './SidebarNavigation';

type TabType = 'session-details' | 'edit-session' | 'pre-survey';

interface SessionOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    topic: string;
    goal: string;
    critical: string;
    context: string;
    crossPollination: boolean;
    promptSummary: string;
    facilitationPrompt?: string;
  };
  questions?: QuestionInfo[];
  onUpdateSession: (updates: any) => Promise<void>;
  onUpdatePrompt?: (prompt: VersionedPrompt) => Promise<void>;
  onUpdateQuestions?: (questions: QuestionInfo[]) => Promise<void>;
  onEditSession?: () => void;
}

export function SessionOverviewModal({
  isOpen,
  onClose,
  sessionData,
  questions: initialQuestions = [],
  onUpdateSession,
  onUpdatePrompt,
  onUpdateQuestions,
  onEditSession,
}: SessionOverviewModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('edit-session');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localQuestions, setLocalQuestions] = useState<QuestionInfo[]>(initialQuestions);
  const initialVersionedPrompt = { id: 0, summary: sessionData.promptSummary, fullPrompt: sessionData.facilitationPrompt || '' };
  const [promptValue, setCurrentVersionedPrompt] = useState<VersionedPrompt>(initialVersionedPrompt);
  const [allFacilitationPrompts, setAllFacilitationPrompts] = useState([initialVersionedPrompt])
  const [currentPromptVersion, setCurrentPromptVersion] = useState(0);
  
  // Update local questions when initialQuestions change
  useEffect(() => {
    const selectedPrompt = allFacilitationPrompts[currentPromptVersion];
    if (selectedPrompt && selectedPrompt !== promptValue) {
      setCurrentVersionedPrompt(selectedPrompt)
      handleSavePrompt(selectedPrompt);
    }
  }, [currentPromptVersion, allFacilitationPrompts, setCurrentVersionedPrompt])

  const addVersionedPrompt = (prompt: VersionedPrompt) => {
    setAllFacilitationPrompts([...allFacilitationPrompts, prompt])
  }

  const handleReplaceFullPrompt = async (fullPrompt: string) => {
    try {
      const sessionRecapPrompt = await getPromptInstructions('SESSION_RECAP');
      const summaryResponse = await sendApiCall({
        target: ApiTarget.Builder,
        action: ApiAction.SummaryOfPrompt,
        data: {
          fullPrompt,
          instructions: sessionRecapPrompt,
        },
      });

      let updatedPrompt: VersionedPrompt = {
        id: currentPromptVersion,
        summary: summaryResponse.fullPrompt,
        fullPrompt,
      };

      setAllFacilitationPrompts((prevPrompts) => {
        const promptIndex = prevPrompts.findIndex(
          (prompt) => prompt.id === currentPromptVersion,
        );

        if (promptIndex === -1) {
          updatedPrompt = {
            ...updatedPrompt,
            id: prevPrompts.length,
          };
          return [...prevPrompts, updatedPrompt];
        }

        const nextPrompts = [...prevPrompts];
        nextPrompts[promptIndex] = updatedPrompt;
        return nextPrompts;
      });

      setCurrentVersionedPrompt(updatedPrompt);
      setCurrentPromptVersion(updatedPrompt.id);
      await handleSavePrompt(updatedPrompt);
    } catch (error) {
      console.error('Failed to replace prompt:', error);
    }
  };

  const handleEditField = (fieldName: string) => {
    setEditingField(fieldName);
  };

  const handleSaveField = async (fieldName: string, value: string | boolean) => {
    try {
      await onUpdateSession({ [fieldName]: value });
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
  };

  const handleSavePrompt = async (versionedPromptToSave?: VersionedPrompt) => {
    if (onUpdatePrompt) {
      try {
        const prompt = versionedPromptToSave ? versionedPromptToSave : promptValue
        await onUpdatePrompt(prompt);
      } catch (error) {
        console.error('Failed to update prompt:', error);
      }
    }
  };

  const addVersionedPrompt = (prompt: VersionedPrompt) => {
    setAllFacilitationPrompts([...allFacilitationPrompts, prompt])
  }

  const handleQuestionsUpdate = async (questions: QuestionInfo[]) => {
    setLocalQuestions(questions);
    if (onUpdateQuestions) {
      await onUpdateQuestions(questions);
    }
  }

  useEffect(() => {
    const selectedPrompt = allFacilitationPrompts[currentPromptVersion];
    if (selectedPrompt && selectedPrompt !== promptValue) {
      setCurrentVersionedPrompt(selectedPrompt)
      handleSavePrompt(selectedPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPromptVersion, allFacilitationPrompts, promptValue])

  const handleCancelPrompt = () => {
    setCurrentVersionedPrompt(initialVersionedPrompt);
  };

  const handleEditVersionedPrompt = async (editValue: string) => {
    console.log('[i] Edit instructions: ', editValue);

    // We need to slightly update the edit instructions so that AI knows to apply those changes to the full prompt, not the summary.
    editValue = `Apply the following changes/improvements to the last full template: \n${editValue}`;
    const payload = {
      target: ApiTarget.Builder,
      action: ApiAction.EditPrompt,
      data: {
        fullPrompt: promptValue.fullPrompt,
        instructions: editValue,
      },
    };

    const newFullPromptResponse = await sendApiCall(payload);
    
    const sessionRecapPrompt = await getPromptInstructions('SESSION_RECAP');
    const newSummaryResponse = await sendApiCall({
      target: ApiTarget.Builder,
      action: ApiAction.SummaryOfPrompt,
      data: {
        fullPrompt: newFullPromptResponse.fullPrompt,
        instructions: sessionRecapPrompt,
      }
    })

    const newVersionedPrompt = {
      id: allFacilitationPrompts.length,
      summary: newSummaryResponse.fullPrompt,
      fullPrompt: newFullPromptResponse.fullPrompt
    };
    setCurrentPromptVersion(allFacilitationPrompts.length)
    setCurrentVersionedPrompt(newVersionedPrompt);  
    addVersionedPrompt(newVersionedPrompt);
  };

  const [sessionDetailsForm, setSessionDetailsForm] = useState({
    sessionName: '',
    goal: '',
    critical: '',
    context: '',
  });

  // Initialize form data when sessionData changes
  useEffect(() => {
    setSessionDetailsForm({
      sessionName: sessionData.topic,
      goal: sessionData.goal,
      critical: sessionData.critical || '',
      context: sessionData.context || '',
    });
  }, [sessionData]);

  const handleSessionDetailsChange = (field: string, value: string) => {
    setSessionDetailsForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSessionDetailsSave = async () => {
    try {
      await onUpdateSession({
        sessionName: sessionDetailsForm.sessionName,
        goal: sessionDetailsForm.goal,
        critical: sessionDetailsForm.critical,
        context: sessionDetailsForm.context,
      });
    } catch (error) {
      console.error('Failed to update session details:', error);
    }
  };

  const handleSessionDetailsCancel = () => {
    setSessionDetailsForm({
      sessionName: sessionData.topic,
      goal: sessionData.goal,
      critical: sessionData.critical || '',
      context: sessionData.context || '',
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'session-details':
        return (
          <SessionDetailsTab
            formData={sessionDetailsForm}
            onFieldChange={handleSessionDetailsChange}
          />
        );

      case 'edit-session':
        return (
          <EditSessionTab
            sessionData={{
              crossPollination: sessionData.crossPollination,
              facilitationPrompt: sessionData.facilitationPrompt,
            }}
            allFacilitationPrompts={allFacilitationPrompts}
            setAllFacilitationPrompts={setAllFacilitationPrompts}
            currentPromptVersion={currentPromptVersion}
            setCurrentPromptVersion={setCurrentPromptVersion}
            promptValue={promptValue}
            setCurrentVersionedPrompt={setCurrentVersionedPrompt}
            onEditVersionedPrompt={handleEditVersionedPrompt}
            onSavePrompt={handleSavePrompt}
            onCancelPrompt={handleCancelPrompt}
            onUpdateSession={onUpdateSession}
            editingField={editingField}
            setEditingField={setEditingField}
          />
        );

          <ReviewPrompt
            prompts={allFacilitationPrompts}
            setPrompts={setAllFacilitationPrompts}
            summarizedPrompt={promptValue.summary}
            currentVersion={currentPromptVersion}
            setCurrentVersion={setCurrentPromptVersion}
            isEditing={editingField === "ReviewPrompt"}
            handleEdit={handleEditVersionedPrompt}
            handleReplaceFullPrompt={handleReplaceFullPrompt}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[calc(100vw-100px)] lg:max-w-[1150px] max-h-[calc(100vh-100px)] h-[calc(100%-100px)] p-0 flex flex-col rounded-xl shadow-lg border-0 overflow-hidden [&>button]:hidden">
        <div className="flex flex-1 overflow-hidden h-full">
          {/* Sidebar */}
          <div className="w-[240px] border-r border-border p-2 flex-shrink-0 overflow-y-auto">
            <div className="flex flex-col justify-between h-full">
              <SidebarNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 relative h-full overflow-hidden">
            <div className="flex flex-col w-full h-full bg-background">
              <div className="flex-grow transform-gpu px-[60px] pt-9 pb-0 overflow-auto relative">
                {renderTabContent()}
                
                {/* Action bar for Session Details tab */}
                {activeTab === 'session-details' && (
                  <SessionDetailsActionBar
                    onSave={handleSessionDetailsSave}
                    onCancel={handleSessionDetailsCancel}
                  />
                )}
              </div>
            </div>
            {/* Close button */}
            <div className="absolute top-3 right-3 w-[22px] h-[22px] rounded-full bg-background z-50 pointer-events-auto">
              <button
                onClick={onClose}
                className="select-none transition-[background] duration-200 ease-in cursor-pointer w-full h-full rounded-full flex justify-center items-center bg-transparent hover:bg-muted"
                aria-label="Close"
                type="button"
              >
                <X className="w-[14px] h-[14px] text-muted-foreground flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 