import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import templates from '@/lib/templates.json';
import { SessionBuilderData } from '@/lib/types';
import {
  Lightbulb,
  History,
  Grid2X2,
  Target,
  ListOrdered,
  ActivitySquare,
  ListChecks,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const iconMap = {
  history: History,
  'grid-2x2': Grid2X2,
  target: Target,
  'list-ordered': ListOrdered,
  lightbulb: Lightbulb,
  'activity-square': ActivitySquare,
  'list-checks': ListChecks,
  'shield-alert': ShieldAlert,
} as const;

interface ChooseTemplateProps {
  onTemplateSelect: (templateDefaults: Partial<SessionBuilderData>) => void;
  onNext: () => void;
}

export default function ChooseTemplate({
  onTemplateSelect,
  onNext,
}: ChooseTemplateProps) {
  const [objective, setObjective] = useState('');
  const [error, setError] = useState('');

  const handleGenerateClick = () => {
    if (!objective.trim()) {
      setError('Please enter your session objective');
      return;
    }

    setError('');
    onTemplateSelect({
      goal: objective,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <Card className="w-1/2 bg-purple-50 dark:bg-purple-950/30">
        <CardHeader className="space-y-1 pb-0">
          <Sparkles className="w-6 h-6" strokeWidth={1.5} />
          <CardTitle className="text-xl">Tell us your objective</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="objective">
              What is the objective of your session?*
            </Label>
            <Textarea
              id="objective"
              value={objective}
              onChange={(e) => {
                setObjective(e.target.value);
                setError(''); // Clear error when user starts typing
              }}
              placeholder="Understand user preferences on our new product features"
              className={`min-h-[80px] resize-y ${
                error ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-sm text-muted-foreground">
              Summarize what you aim to learn or achieve in this session
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateClick}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <h4 className="text-xl font-semibold">Or Select Template</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.templates.map((template) => {
          const Icon =
            iconMap[template.icon as keyof typeof iconMap] ?? Lightbulb;
          return (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <Icon className="w-6 h-6 mb-2" strokeWidth={1.5} />
                <CardTitle className="text-xl">{template.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end mt-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    onTemplateSelect(template.defaults);
                    onNext();
                  }}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  Generate
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}