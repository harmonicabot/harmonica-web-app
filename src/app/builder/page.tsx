'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { sendApiCall, sendCallToMake } from '@/lib/utils';
import { TemplateBuilderData } from '@/lib/types';
import { useRouter } from 'next/navigation';


const sections = [
  "Template Info",
  "Facilitator Role & Goal",
  "The Session",
  "Template Settings"
];

export default function TemplatePage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<TemplateBuilderData>({
    templateName: '',
    templateDescription: '',
    aiRole: '',
    taskDescription: '',
    actionSteps: [''],
    otherInstructions: '',
    createSummary: false,
    summaryFeedback: false,
    requireContext: false,
    contextDescription: '',
    enableSkipSteps: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    console.log(formData);
  };

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setFormData({ ...formData, [name]: checked });
  };

  const handleActionStepChange = (index: number, value: string) => {
    const newActionSteps = [...formData.actionSteps];
    newActionSteps[index] = value;
    setFormData({ ...formData, actionSteps: newActionSteps });
  };

  const addActionStep = () => {
    setFormData({ ...formData, actionSteps: [...formData.actionSteps, ''] });
  };

  const router = useRouter();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form...: ', e);
    sendApiCall({
      target: 'builder',
      data: {
        ...formData
      },
    }).then((response) => {
      router.push(`/sessions/create?assistantId=${response.assistantId}&templateName=${formData.templateName}&botName=harmonica_chat_bot`);
    })
  };

  const renderSection = () => {
    switch (currentSection) {
      case 0:
        console.log("Rendering section 0");
        return (
          <div className="space-y-4">
            <Input
              name="templateName"
              value={formData.templateName}
              onChange={handleInputChange}
              placeholder="Template Name"
            />
            <Textarea
              name="templateDescription"
              value={formData.templateDescription}
              onChange={handleInputChange}
              placeholder="Template Description"
            />
            <p className="text-sm text-gray-500">
              Instructions: Use [CONTEXT], [TOPIC], [ACTION STEP] etc. during instructions for placeholders.
            </p>
          </div>
        );
      case 1:
        console.log("Rendering section 1");
        return (
          <div className="space-y-4">
            <Input
              name="aiRole"
              value={formData.aiRole}
              onChange={handleInputChange}
              placeholder="AI Role/Personality"
            />
            <Textarea
              name="taskDescription"
              value={formData.taskDescription}
              onChange={handleInputChange}
              placeholder="Task/Description/Goal"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            {formData.actionSteps.map((step, index) => (
              <Input
                key={index}
                value={step}
                onChange={(e) => handleActionStepChange(index, e.target.value)}
                placeholder={`Action Step ${index + 1}`}
              />
            ))}
            <Button onClick={(e) => {
              e.preventDefault();
              addActionStep();
            }}>
              + Add Action Step
            </Button>
            <Textarea
              name="otherInstructions"
              value={formData.otherInstructions}
              onChange={handleInputChange}
              placeholder="Other Instructions"
            />
            <div className="flex items-center space-x-2">
              <Switch
                id="create-summary"
                checked={formData.createSummary}
                onCheckedChange={handleSwitchChange('createSummary')}
              />
              <label htmlFor="create-summary">Create Summary</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="summary-feedback"
                checked={formData.summaryFeedback}
                onCheckedChange={handleSwitchChange('summaryFeedback')}
              />
              <label htmlFor="summary-feedback">Summary Feedback</label>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="require-context"
                checked={formData.requireContext}
                onCheckedChange={handleSwitchChange('requireContext')}
              />
              <label htmlFor="require-context">Require Context</label>
            </div>
            {formData.requireContext && (
              <Input
                name="contextDescription"
                value={formData.contextDescription}
                onChange={handleInputChange}
                placeholder="What context is required?"
              />
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="enable-skip-steps"
                checked={formData.enableSkipSteps}
                onCheckedChange={handleSwitchChange('enableSkipSteps')}
              />
              <label htmlFor="enable-skip-steps">Enable participants to skip steps</label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white p-6">
        <nav>
          <ul>
            {sections.map((section, index) => (
              <li key={index} className="mb-2">
                <button
                  onClick={() => setCurrentSection(index)}
                  className={`w-full text-left p-2 rounded ${
                    currentSection === index ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                  }`}
                >
                  {section}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">{sections[currentSection]}</h1>
        <form className="bg-white p-6 rounded shadow">
          {renderSection()}
          <div className="mt-6 flex justify-between">
            {currentSection > 0 && (
              <Button onClick={(e) => {
                e.preventDefault();
                setCurrentSection(currentSection - 1)
              }}>
                Previous
              </Button>
            )}
            {currentSection < sections.length - 1 && (
              <Button onClick={(e) => {
                e.preventDefault()
                console.log(currentSection);
                setCurrentSection(currentSection + 1);
              }}>
                Next
              </Button>
            )}
            {currentSection === sections.length - 1 && (
              <Button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
              >
                Submit
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
