'use client';

// Session Overview Modal Component
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Edit2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { ApiAction, ApiTarget, SessionBuilderData } from '@/lib/types';
import { HRMarkdown } from '@/components/HRMarkdown';
import ReviewPrompt from 'app/create/review';
import { sendApiCall } from '@/lib/clientUtils';
import { VersionedPrompt } from 'app/create/creationFlow';
import { getPromptInstructions } from '@/lib/promptActions';

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
  onUpdateSession: (updates: any) => Promise<void>;
  onUpdatePrompt?: (prompt: VersionedPrompt) => Promise<void>;
  onEditSession?: () => void;
}

interface SessionFieldProps {
  label: string;
  value: string | boolean;
  type: 'text' | 'textarea' | 'boolean';
  onEdit: () => void;
  isEditing: boolean;
  onSave: (value: string | boolean) => void;
  onCancel: () => void;
  placeholder?: string;
}

function SessionField({
  label,
  value,
  type,
  onEdit,
  isEditing,
  onSave,
  onCancel,
  placeholder,
}: SessionFieldProps) {
  const [editValue, setEditValue] = useState(value);
  const [showEditButton, setShowEditButton] = useState(false);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    onCancel();
  };

  const renderValue = () => {
    if (type === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch checked={value as boolean} disabled />
          <span className="text-sm text-muted-foreground">
            Allow participants to see and build upon each other's responses
          </span>
        </div>
      );
    }
    
    if (typeof value === 'string') {
      return (
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {value || <span className="text-muted-foreground italic">Not specified</span>}
        </div>
      );
    }
    
    return null;
  };

  const renderEditForm = () => {
    if (type === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={editValue as boolean}
            onCheckedChange={(checked) => setEditValue(checked)}
          />
          <span className="text-sm text-muted-foreground">
            Allow participants to see and build upon each other's responses
          </span>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <Textarea
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
        />
      );
    }

    return (
      <Input
        value={editValue as string}
        onChange={(e) => setEditValue(e.target.value)}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      </div>
      
      <div 
        className="relative group"
        onMouseEnter={() => setShowEditButton(true)}
        onMouseLeave={() => setShowEditButton(false)}
      >
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className={`absolute top-1 right-2 z-10 transition-opacity px-3 ${
              showEditButton ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      
        {isEditing ? (
          <div className="space-y-2">
            {renderEditForm()}
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          renderValue()
        )}
      </div>
    </div>
  );
}

export function SessionOverviewModal({
  isOpen,
  onClose,
  sessionData,
  onUpdateSession,
  onUpdatePrompt,
  onEditSession,
}: SessionOverviewModalProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const initialVersionedPrompt = { id: 0, summary: sessionData.promptSummary, fullPrompt: sessionData.facilitationPrompt || '' };
  const [promptValue, setCurrentVersionedPrompt] = useState<VersionedPrompt>(initialVersionedPrompt);
  const [allFacilitationPrompts, setAllFacilitationPrompts] = useState([initialVersionedPrompt])
  // This is mainly a requirement of the ReviewPrompt component; theoretically we could also get the version from currentPrompt
  const [currentPromptVersion, setCurrentPromptVersion] = useState(0);
  
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
        setEditingPrompt(false);
      } catch (error) {
        console.error('Failed to update prompt:', error);
      }
    }
  };

  const handleCancelPrompt = () => {
    setCurrentVersionedPrompt(initialVersionedPrompt);
    setEditingPrompt(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] lg:max-w-[75vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Session Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8">
          {/* Session Name */}
          <SessionField
            label="Session Name"
            value={sessionData.topic}
            type="text"
            onEdit={() => handleEditField('sessionName')}
            isEditing={editingField === 'sessionName'}
            onSave={(value) => handleSaveField('sessionName', value)}
            onCancel={handleCancelEdit}
            placeholder="Enter session name"
          />

          {/* Goal and Critical Info - Side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SessionField
              label="Goal"
              value={sessionData.goal}
              type="textarea"
              onEdit={() => handleEditField('goal')}
              isEditing={editingField === 'goal'}
              onSave={(value) => handleSaveField('goal', value)}
              onCancel={handleCancelEdit}
              placeholder="What is the objective of your session?"
            />
            
            <SessionField
              label="Critical Info"
              value={sessionData.critical}
              type="textarea"
              onEdit={() => handleEditField('critical')}
              isEditing={editingField === 'critical'}
              onSave={(value) => handleSaveField('critical', value)}
              onCancel={handleCancelEdit}
              placeholder="What is critical to gather from participants?"
            />
          </div>

          {/* Context */}
          <SessionField
            label="Context"
            value={sessionData.context}
            type="textarea"
            onEdit={() => handleEditField('context')}
            isEditing={editingField === 'context'}
            onSave={(value) => handleSaveField('context', value)}
            onCancel={handleCancelEdit}
            placeholder="What context would be useful for our AI to know?"
          />

          {/* Cross Pollination */}
          <SessionField
            label="Cross Pollination"
            value={sessionData.crossPollination}
            type="boolean"
            onEdit={() => handleEditField('crossPollination')}
            isEditing={editingField === 'crossPollination'}
            onSave={(value) => handleSaveField('crossPollination', value)}
            onCancel={handleCancelEdit}
          />

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
        <Button
                variant="default"
                onClick={() => editingField === "ReviewPrompt" ? setEditingField("") : setEditingField("ReviewPrompt")}
              >
                Edit Session Design
              </Button>

          {/* Advanced: See Raw Prompts */}
          <div className="space-y-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-gray-700 transition-colors"
            >
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Advanced: See Raw Prompts</span>
            </button>
            
            {showAdvanced && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-muted-foreground">Facilitation Prompt</Label>
                    {!editingPrompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPrompt(true)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {editingPrompt ? (
                    <div className="space-y-2">
                      <Textarea
                        value={promptValue.fullPrompt}
                        onChange={(e) => setCurrentVersionedPrompt({ ...promptValue, fullPrompt: e.target.value })}
                        placeholder="Enter facilitation prompt..."
                        className="font-mono text-sm font-medium text-base min-h-[200px]"
                      />
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleSavePrompt()}>
                          <Check className="h-3 w-3" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelPrompt}>
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {sessionData.facilitationPrompt ? (
                        <HRMarkdown content={sessionData.facilitationPrompt} />
                      ) : (
                        <span className="text-muted-foreground italic">
                          No facilitation prompt available
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 