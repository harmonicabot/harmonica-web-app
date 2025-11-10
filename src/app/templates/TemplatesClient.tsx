'use client';

import { useRouter } from 'next/navigation';
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
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap = {
  history: History,
  'grid-2x2': Grid2X2,
  target: Target,
  'list-ordered': ListOrdered,
  lightbulb: Lightbulb,
  'activity-square': ActivitySquare,
  'list-checks': ListChecks,
  'shield-alert': ShieldAlert,
  sparkles: Sparkles,
  leaf: Leaf,
} as const;

export default function TemplatesClient() {
  const router = useRouter();

  const handleTemplateSelect = (templateDefaults: Partial<SessionBuilderData>) => {
    // Store template data in sessionStorage with timestamp
    const prefillData = {
      ...templateDefaults,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('createSessionPrefill', JSON.stringify(prefillData));
    // Store flag to indicate we should skip to step 4 (review step)
    sessionStorage.setItem('templateSkipToReview', 'true');
    // Navigate to create flow
    router.push('/create');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Session Templates</h1>
        <p className="text-muted-foreground">
          Choose a template to get started quickly, or create your own from scratch
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  size="sm"
                  onClick={() => handleTemplateSelect(template.defaults)}
                  className="flex"
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
