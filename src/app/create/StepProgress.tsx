'use client';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  isObjectivePrefilled?: boolean;
}

export function StepProgress({ 
  currentStep, 
  totalSteps, 
  isObjectivePrefilled = false 
}: StepProgressProps) {
  // Hide entire component on intro step
  if (currentStep === 0) {
    return null;
  }

  // Display numbered steps starting at Objective as 1..totalSteps
  const displayStep = Math.max(currentStep, 0);
  const displayTotal = totalSteps;
  
  // Calculate progress percentage
  // Intro: minimal progress, then proportional across numbered steps
  const progressPercentage = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {/* Step indicator */}
      {currentStep !== 0 && (
        <div className="text-center mb-4">
          <span className="text-sm font-medium text-muted-foreground">
            Step {displayStep} of {displayTotal}
          </span>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-yellow-400 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${Math.max(progressPercentage, 0)}%` }}
        />
      </div>
    </div>
  );
}
