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
  // When objective is pre-filled, we can still go back to step 1 to see the pre-filled content
  const isFirstStep = currentStep === 1;
  
  // Determine if we're on the last step
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex justify-center gap-8 mt-8 max-w-md mx-auto">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </Button>
      
      <Button
        type="button"
        onClick={onNext}
        disabled={isNextDisabled || isLoading}
        className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Loading...
          </>
        ) : (
          <>
            {nextLabel === 'Generate Session' && <Sparkles className="w-4 h-4" />}
            {nextLabel}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
}