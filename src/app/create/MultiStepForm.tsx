'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SessionBuilderData } from '@/lib/types';
import { StepProgress } from './StepProgress';
import { StepNavigation } from './StepNavigation';
import { FormStep, StepValidation } from './types';

interface MultiStepFormProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formData: SessionBuilderData;
  onFormDataChange: (form: Partial<SessionBuilderData>) => void;
  onValidationError: (hasErrors: boolean) => void;
  isLoading?: boolean;
  onBackToDashboard?: () => void;
}

export default function MultiStepForm({
  onSubmit,
  formData,
  onFormDataChange,
  onValidationError,
  isLoading = false,
  onBackToDashboard
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(0); // Start at step 0 (intro)
  const [stepValidations, setStepValidations] = useState<Record<number, StepValidation>>({});
  const [isObjectivePrefilled, setIsObjectivePrefilled] = useState(false);

  // Check if objective is pre-filled on mount only
  useEffect(() => {
    if (formData.goal?.trim()) {
      setIsObjectivePrefilled(true);
      setCurrentStep(2); // Skip to step 2 (critical) - intro is step 0, objective is step 1
    }
  }, []); // Empty dependency array - only run on mount

  // Validate current step
  const validateStep = (step: number): StepValidation => {
    switch (step) {
      case 0: // Intro - no validation needed
        return { isValid: true };

      case 1: // Objective
        if (!formData.goal?.trim()) {
          return { isValid: false, error: 'Please provide your session objective' };
        }
        if (formData.goal.trim().length < 10) {
          return { isValid: false, error: 'Please provide a more detailed objective (at least 10 characters)' };
        }
        return { isValid: true };

      case 2: // Critical to gather
        if (!formData.critical?.trim()) {
          return { isValid: false, error: 'Please specify what information you need from participants' };
        }
        if (formData.critical.trim().length < 10) {
          return { isValid: false, error: 'Please provide more specific requirements (at least 10 characters)' };
        }
        return { isValid: true };

      case 3: // Context
        if (!formData.context?.trim()) {
          return { isValid: false, error: 'Adding context helps our AI better understand your session' };
        }
        return { isValid: true };

      case 4: // Session name
        if (!formData.sessionName?.trim()) {
          return { isValid: false, error: 'Please provide a session name' };
        }
        if (formData.sessionName.trim().length < 3) {
          return { isValid: false, error: 'Session name must be at least 3 characters' };
        }
        return { isValid: true };

      default:
        return { isValid: true };
    }
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    onFormDataChange({ [name]: value });
    
    // Clear validation error for this step when user starts typing
    if (stepValidations[currentStep]?.error) {
      setStepValidations(prev => ({
        ...prev,
        [currentStep]: { isValid: true }
      }));
    }
  };

  // Handle next step
  const handleNext = () => {
    const validation = validateStep(currentStep);
    setStepValidations(prev => ({ ...prev, [currentStep]: validation }));

    if (validation.isValid) {
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Submit form on last step
        onSubmit(new Event('submit') as any);
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (currentStep === 0 && onBackToDashboard) {
      // On intro step (step 0), go back to dashboard
      onBackToDashboard();
    }
  };

  // Update validation errors for parent component
  useEffect(() => {
    const hasErrors = Object.values(stepValidations).some(validation => !validation.isValid);
    onValidationError(hasErrors);
  }, [stepValidations, onValidationError]);

  // Render current step content
  const renderStepContent = () => {
    // When objective is pre-filled, we start at step 2, but we still need to show the right content
    // currentStep 1 = Objective, currentStep 2 = Critical, etc.
    const stepToRender = currentStep;
    
    switch (stepToRender) {
      case 0: // Intro
        return (
          <div className="space-y-6 bg-white rounded-lg p-6 border -m-4">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Let's build your session in just a few steps</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-4">
                <div className="flex mx-auto mb-1">
                  <span className="text-muted-foreground">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Create</h3>
                <p className="text-sm text-muted-foreground">Tell us what you want to discover and we'll craft the perfect questions.</p>
              </div>
              
              <div className="p-4">
                <div className="flex mx-auto mb-1">
                  <span className="text-muted-foreground">2</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Share</h3>
                <p className="text-sm text-muted-foreground">Share the link with your group and watch responses flow in naturally.</p>
              </div>
              
              <div className="p-4">
                <div className="flex mx-auto mb-1">
                  <span className="text-muted-foreground">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Analyze</h3>
                <p className="text-sm text-muted-foreground">Get AI-powered insights and actionable recommendations.</p>
              </div>
            </div>

          </div>
        );

      case 1: // Objective
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">What's your objective?</h2>
              <p className="text-muted-foreground">Summarize what you are trying to achieve through these interviews</p>
            </div>
            <div className="space-y-2">
              <Textarea
                name="goal"
                value={formData.goal}
                onChange={handleInputChange}
                placeholder="I want to understand user preferences on our new product features."
                className={`min-h-[120px] resize-none text-base ${
                  stepValidations[currentStep]?.error ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-red-500">{stepValidations[currentStep].error}</p>
              )}
            </div>
          </div>
        );

      case 2: // Critical to gather
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">What is critical to gather?</h2>
              <p className="text-muted-foreground">Specify what kind of information or details you need from participant responses</p>
            </div>
            <div className="space-y-2">
              <Textarea
                name="critical"
                value={formData.critical}
                onChange={handleInputChange}
                placeholder="Participants should provide examples of their workflows or describe challenges they face."
                className={`min-h-[120px] resize-none text-base ${
                  stepValidations[currentStep]?.error ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-red-500">{stepValidations[currentStep].error}</p>
              )}
            </div>
          </div>
        );

      case 3: // Context
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Add any context</h2>
              <p className="text-muted-foreground">Provide background to help our AI understand the purpose of your session</p>
            </div>
            <div className="space-y-2">
              <Textarea
                name="context"
                value={formData.context}
                onChange={handleInputChange}
                placeholder="Our company is developing a new app, and this session is part of our usability testing to gather user feedback on key features."
                className={`min-h-[120px] resize-none text-base ${
                  stepValidations[currentStep]?.error ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-red-500">{stepValidations[currentStep].error}</p>
              )}
            </div>
          </div>
        );

      case 4: // Session name
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Name your session</h2>
              <p className="text-muted-foreground">Enter a clear session name that will be shared with participants</p>
            </div>
            <div className="space-y-2">
              <Input
                name="sessionName"
                value={formData.sessionName}
                onChange={handleInputChange}
                placeholder="Your session name"
                className={`text-base ${
                  stepValidations[currentStep]?.error ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-red-500">{stepValidations[currentStep].error}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex gap-6 justify-center">

        {/* Left side - Form content (2/3) */}
        <div className="flex-1 max-w-2xl">
          <StepProgress 
            currentStep={currentStep} 
            totalSteps={5} 
            isObjectivePrefilled={isObjectivePrefilled}
          />
          
          <div className="bg-yellow-50 p-8 rounded-xl shadow-md border">
            {renderStepContent()}
          </div>
          
          <StepNavigation
            currentStep={currentStep}
            totalSteps={5}
            isObjectivePrefilled={isObjectivePrefilled}
            onPrevious={handlePrevious}
            onNext={handleNext}
            isLoading={isLoading}
            nextLabel={currentStep === 4 ? 'Generate Session' : 'Next'}
          />
        </div>

        {/* Right side - Image (1/3) */}
        <div className="flex-1 max-w-sm flex items-center justify-center">
          <div className="w-full max-w-sm">
            <img 
              src="/chat-example.png" 
              alt="Chat example showing conversation flow" 
              className="w-full h-auto"
            />
          </div>
        </div>

        
      </div>
    </div>
  );
}
