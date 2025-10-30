'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SessionBuilderData } from '@/lib/types';
import { StepProgress } from './StepProgress';
import { StepNavigation } from './StepNavigation';
import { FormStep, StepValidation } from './types';
import { Edit2, Check, X } from 'lucide-react';

interface MultiStepFormProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formData: SessionBuilderData;
  onFormDataChange: (form: Partial<SessionBuilderData>) => void;
  onValidationError: (hasErrors: boolean) => void;
  isLoading?: boolean;
  onBackToDashboard?: () => void;
  initialStep?: number;
}

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
}

function EditableField({
  label,
  value,
  onSave,
  placeholder,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showEditButton, setShowEditButton] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
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
            onClick={() => setIsEditing(true)}
            className={`absolute top-1 right-2 z-10 transition-opacity px-3 ${
              showEditButton ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="min-h-[100px] resize-none text-base"
            />
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
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-md border min-h-[80px]">
            {value || <span className="text-muted-foreground italic">Not specified</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MultiStepForm({
  onSubmit,
  formData,
  onFormDataChange,
  onValidationError,
  isLoading = false,
  onBackToDashboard,
  initialStep
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(initialStep ?? 0); // Start at provided step or 0
  const [stepValidations, setStepValidations] = useState<Record<number, StepValidation>>({});
  const [isObjectivePrefilled, setIsObjectivePrefilled] = useState(initialStep ? initialStep > 1 : false);

  // Check if objective is pre-filled and handle template navigation
  useEffect(() => {
    if (initialStep !== undefined && formData.goal?.trim() && formData.critical?.trim()) {
      // If we have an initial step and the data is loaded, go to that step
      setIsObjectivePrefilled(true);
      setCurrentStep(initialStep);
      return;
    }
    
    // Legacy behavior for when goal is pre-filled but no initial step
    if (formData.goal?.trim() && initialStep === undefined) {
      setIsObjectivePrefilled(true);
      // Only update if we're at step 0, to avoid overriding user navigation
      setCurrentStep(prev => prev === 0 ? 2 : prev);
    }
  }, [formData.goal, formData.critical, initialStep]);

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
        // Context is optional, no validation needed
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
        // Clear any validation error for the new step
        setStepValidations(prev => ({ ...prev, [currentStep + 1]: { isValid: true } }));
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
          <div className="bg-white rounded-lg md:p-4 border -m-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              {/* Image left */}
              <div className="w-full hidden md:block md:col-span-2">
                <img 
                  src="/chat-example.png" 
                  alt="Chat example showing conversation flow" 
                  className="w-full h-auto"
                />
              </div>
              {/* Content right */}
              <div className="space-y-4 p-6 md:col-span-3">
                <div>
                  <h2 className="text-2xl mb-2">Let's design your session</h2>
                  <p className="text-muted-foreground">You’ll:</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>Share your project goals and context</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>Co-design your conversational guide with AI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>Review and edit your pre-session form</span>
                  </li>
                </ul>
                <p className="text-muted-foreground">Ready to get started?</p>
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
                  stepValidations[currentStep]?.error ? 'border-yellow-700 focus-visible:ring-yellow-700' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-yellow-700">{stepValidations[currentStep].error}</p>
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
                  stepValidations[currentStep]?.error ? 'border-yellow-700 focus-visible:ring-yellow-700' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-yellow-700">{stepValidations[currentStep].error}</p>
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
                  stepValidations[currentStep]?.error ? 'border-yellow-700 focus-visible:ring-yellow-700' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-yellow-700">{stepValidations[currentStep].error}</p>
              )}
            </div>
          </div>
        );

      case 4: // Session name with recap
        return (
          <div className="space-y-2">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Name your session</h2>
              <p className="text-muted-foreground">Enter a clear session name that will be shared with participants</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sessionName" className="text-base font-medium">
                Session Name
              </Label>
              <Input
                id="sessionName"
                name="sessionName"
                value={formData.sessionName}
                onChange={handleInputChange}
                placeholder="Your session name"
                className={`text-base ${
                  stepValidations[currentStep]?.error ? 'border-yellow-700 focus-visible:ring-yellow-700' : ''
                }`}
              />
              {stepValidations[currentStep]?.error && (
                <p className="text-sm text-yellow-700">{stepValidations[currentStep].error}</p>
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
        <div className="flex-1 max-w-3xl space-y-6">
          <StepProgress 
            currentStep={currentStep} 
            totalSteps={4} 
            isObjectivePrefilled={isObjectivePrefilled}
          />
          
          <div className="bg-yellow-50 p-8 rounded-xl shadow-md border md:min-w-[720px]">
            {renderStepContent()}
          </div>

          {/* Review section for step 4 */}
          {currentStep === 4 && (
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold">Session Summary</h3>
              <EditableField
                label="Objective"
                value={formData.goal || ''}
                onSave={(value) => onFormDataChange({ goal: value })}
                placeholder="I want to understand user preferences on our new product features."
              />
              <EditableField
                label="Critical to gather"
                value={formData.critical || ''}
                onSave={(value) => onFormDataChange({ critical: value })}
                placeholder="Participants should provide examples of their workflows or describe challenges they face."
              />
              <EditableField
                label="Context"
                value={formData.context || ''}
                onSave={(value) => onFormDataChange({ context: value })}
                placeholder="Our company is developing a new app, and this session is part of our usability testing to gather user feedback on key features."
              />
            </div>
          )}
          
          <StepNavigation
            currentStep={currentStep}
            totalSteps={4}
            isObjectivePrefilled={isObjectivePrefilled}
            onPrevious={handlePrevious}
            onNext={handleNext}
            isLoading={isLoading}
            nextLabel={currentStep === 4 ? 'Generate Session' : 'Next'}
          />
        </div>

        {/* Right side removed; intro image moved inside card to avoid layout shift */}

        
      </div>
    </div>
  );
}
