import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import templates from '@/lib/templates.json';
import { SessionBuilderData } from '@/lib/types';
import { Lightbulb, MessageCircle, CheckSquare } from 'lucide-react';

const iconMap = {
  Lightbulb,
  MessageCircle,
  CheckSquare,
};

interface ChooseTemplateProps {
  onTemplateSelect: (templateDefaults: Partial<SessionBuilderData>) => void;
  onNext: () => void;
}

export default function ChooseTemplate({
  onTemplateSelect,
  onNext,
}: ChooseTemplateProps) {
  const handleTemplateClick = (
    templateDefaults: Partial<SessionBuilderData>,
  ) => {
    onTemplateSelect(templateDefaults);
    onNext();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.templates.map((template) => {
        const Icon = iconMap[template.icon as keyof typeof iconMap];
        return (
          <Card
            key={template.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleTemplateClick(template.defaults)}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                <CardTitle>{template.title}</CardTitle>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
