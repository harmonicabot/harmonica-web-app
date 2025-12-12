'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  isObjectivePrefilled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  nextLabel?: string;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  isObjectivePrefilled = false,
  onPrevious,
  onNext,
  isNextDisabled = false,
  isLoading = false,
  nextLabel = 'Next'
}: StepNavigationProps) {
  // Determine if we're on the first step
  // Back button is now enabled on first step to go back to dashboard
  const isFirstStep = false; // Always allow back button
  
  // Determine if we're on the last step
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-between mt-8 md:min-w-[720px]">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </Button>
      
      <Button
        type="button"
        variant="default"
        onClick={onNext}
        disabled={isNextDisabled || isLoading}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading...
          </>
        ) : (
          <>
            {nextLabel === 'Generate Session' && <Sparkles className="w-4 h-4" />}
            <span className="px-1">{nextLabel}</span>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
}