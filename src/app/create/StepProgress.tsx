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
  // Always show the actual step numbers (1-4)
  const displayStep = currentStep;
  const displayTotal = totalSteps;
  
  // Calculate progress percentage
  // Step 1: 5%, Step 2: 25%, Step 3: 50%, Step 4: 75%
  const progressPercentage = ((currentStep - 1) * 25 + 5);

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      {/* Step indicator */}
      <div className="text-center mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          Step {displayStep} of {displayTotal}
        </span>
      </div>
      
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
