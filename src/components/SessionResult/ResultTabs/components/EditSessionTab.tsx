'use client';

import { useState, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { HRMarkdown } from '@/components/HRMarkdown';
import ReviewPrompt from 'app/create/review';
import { VersionedPrompt } from 'app/create/creationFlow';
import { SessionField } from './SessionField';

interface EditSessionTabProps {
  sessionData: {
    crossPollination: boolean;
    facilitationPrompt?: string;
  };
  allFacilitationPrompts: VersionedPrompt[];
  setAllFacilitationPrompts: (value: SetStateAction<VersionedPrompt[]>) => void;
  handleReplaceFullPrompt: (fullPrompt: string) => void;
  currentPromptVersion: number;
  setCurrentPromptVersion: (version: number) => void;
  promptValue: VersionedPrompt;
  setCurrentVersionedPrompt: (prompt: VersionedPrompt) => void;
  onEditVersionedPrompt: (editValue: string) => Promise<void>;
  onSavePrompt: (prompt?: VersionedPrompt) => Promise<void>;
  onCancelPrompt: () => void;
  onUpdateSession: (updates: any) => Promise<void>;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
}

export function EditSessionTab({
  sessionData,
  allFacilitationPrompts,
  setAllFacilitationPrompts,
  handleReplaceFullPrompt,
  currentPromptVersion,
  setCurrentPromptVersion,
  promptValue,
  setCurrentVersionedPrompt,
  onEditVersionedPrompt,
  onSavePrompt,
  onCancelPrompt,
  onUpdateSession,
  editingField,
  setEditingField,
}: EditSessionTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const handlePromptSave = async () => {
    await onSavePrompt();
    setEditingPrompt(false);
  };
  const handlePromptCancel = () => {
    onCancelPrompt();
    setEditingPrompt(false);
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Edit Session</h3>
        <p className="text-sm text-muted-foreground">
          Customize your session design, prompts, and settings.
        </p>
      </div>

      {/* a. Your generated session */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Generated Session</h3>
          <Button
            variant={editingField === "ReviewPrompt" ? "default" : "outline"}
            onClick={() => editingField === "ReviewPrompt" ? setEditingField("") : setEditingField("ReviewPrompt")}
          >
            {editingField === "ReviewPrompt" ? "Done Editing" : "Edit Session Design"}
          </Button>
        </div>
        <ReviewPrompt
          prompts={allFacilitationPrompts}
          handleReplaceFullPrompt={handleReplaceFullPrompt}
          setPrompts={setAllFacilitationPrompts}
          summarizedPrompt={''}
          currentVersion={currentPromptVersion}
          setCurrentVersion={setCurrentPromptVersion}
          isEditing={editingField === "ReviewPrompt"}
          handleEdit={onEditVersionedPrompt}
        />
      </div>

      {/* b. Advanced: See Raw Prompts */}
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
                    <Button size="sm" onClick={handlePromptSave}>
                      <Check className="h-3 w-3" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePromptCancel}>
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

      {/* c. Cross Pollination */}
      <SessionField
        label="Cross Pollination"
        value={sessionData.crossPollination}
        type="boolean"
        onEdit={() => handleEditField('crossPollination')}
        isEditing={editingField === 'crossPollination'}
        onSave={(value) => handleSaveField('crossPollination', value)}
        onCancel={handleCancelEdit}
      />
    </div>
  );
}

