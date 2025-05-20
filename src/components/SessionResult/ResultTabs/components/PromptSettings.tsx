import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PromptSettingsProps {
  sessionId: string;
  currentPrompt: string;
  summaryPrompt?: string;
  onPromptChange: (
    newPrompt: string,
    type: 'facilitation' | 'summary',
  ) => Promise<void>;
}

export function PromptSettings({
  sessionId,
  currentPrompt,
  summaryPrompt = '',
  onPromptChange,
}: PromptSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [facilitationPrompt, setFacilitationPrompt] = useState(currentPrompt);
  const [summaryPromptText, setSummaryPromptText] = useState(summaryPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('facilitation');

  // Update local state when props change
  useEffect(() => {
    if (isOpen) {
      setFacilitationPrompt(currentPrompt);
      setSummaryPromptText(summaryPrompt);
    }
  }, [currentPrompt, summaryPrompt, isOpen]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const promptToSave =
        activeTab === 'facilitation' ? facilitationPrompt : summaryPromptText;
      const promptType =
        activeTab === 'facilitation' ? 'facilitation' : 'summary';

      console.log('Saving prompt:', { type: promptType, prompt: promptToSave });

      await onPromptChange(promptToSave, promptType);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          Edit Prompts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[80vh] max-h-[800px] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold">
            AI Prompt Settings
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2 mb-2">
              <TabsTrigger
                value="facilitation"
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Facilitation Prompt
              </TabsTrigger>
              {/* <TabsTrigger value="summary" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Summary Prompt
              </TabsTrigger> */}
            </TabsList>

            <div className="flex-1 flex flex-col min-h-0">
              <TabsContent
                value="facilitation"
                className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden"
              >
                <div className="flex-1 flex flex-col min-h-0">
                  <Label
                    htmlFor="facilitation-prompt"
                    className="text-base mb-1"
                  >
                    Facilitation Prompt
                  </Label>
                  <Textarea
                    id="facilitation-prompt"
                    value={facilitationPrompt}
                    onChange={(e) => setFacilitationPrompt(e.target.value)}
                    className="flex-1 text-base p-4 font-mono resize-none"
                    placeholder="Enter your facilitation prompt..."
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="summary"
                className="flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden"
              >
                <div className="flex-1 flex flex-col min-h-0">
                  <Label htmlFor="summary-prompt" className="text-base mb-1">
                    Summary Prompt
                  </Label>
                  <Textarea
                    id="summary-prompt"
                    value={summaryPromptText}
                    onChange={(e) => setSummaryPromptText(e.target.value)}
                    className="flex-1 text-base p-4 font-mono resize-none"
                    placeholder="Enter your summary prompt..."
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
