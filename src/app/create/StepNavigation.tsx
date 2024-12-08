import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Pencil, Sparkles } from 'lucide-react';
import { Step } from './types';

interface StepNavigationProps {
  activeStep: Step;
  isLoading: boolean;
  isEditingPrompt: boolean;
  hasValidationErrors: boolean;
  formData: any;
  setIsEditingPrompt: (value: boolean) => void;
  handleBack: () => void;
  handleNext: (e: React.FormEvent) => void;
  nextLabel?: string;
}

export function StepNavigation({
  activeStep,
  isLoading,
  isEditingPrompt,
  hasValidationErrors,
  formData,
  setIsEditingPrompt,
  handleBack,
  handleNext,
  nextLabel = 'Next'
}: StepNavigationProps) {
  if (isLoading || activeStep === 'Template') return null;

  return (
    <div className="flex justify-between items-center pt-4">
      <Button
        className="m-2"
        variant="ghost"
        onClick={handleBack}
      >
        <ChevronLeft className="w-4 h-4 me-2" strokeWidth={1.5} />
        Back
      </Button>
      <div className="flex space-x-2">
        {activeStep === 'Refine' && !isEditingPrompt && (
          <Button
            className="m-2"
            variant="outline"
            onClick={() => setIsEditingPrompt(true)}
          >
            <Pencil className="w-4 h-4 me-2" strokeWidth={1.5} />
            Edit Session
          </Button>
        )}
        <Button
          type="submit"
          onClick={handleNext}
          className="m-2"
          disabled={
            activeStep === 'Create' &&
            (hasValidationErrors ||
              !formData.sessionName?.trim() ||
              !formData.goal?.trim())
          }
        >
          {activeStep === 'Create' ? (
            <>
              <Sparkles className="w-4 h-4 me-2" strokeWidth={1.5} />
              Generate
            </>
          ) : activeStep === 'Share' ? (
            <>
              Launch
            </>
          ) : (
            <>
              Finish
              <ChevronRight className="w-4 h-4 ms-2" strokeWidth={1.5} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 